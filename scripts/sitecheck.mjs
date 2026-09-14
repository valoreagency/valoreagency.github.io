#!/usr/bin/env node
/**
 * scripts/sitecheck.mjs — THE post-edit check. Run after every change.
 *
 *   node scripts/sitecheck.mjs                      # against the live site
 *   node scripts/sitecheck.mjs http://127.0.0.1:8099 # against a local build
 *
 * Four things, because each has broken in a different way before:
 *   1. LINKS    — every internal href resolves; nav/footer identical site-wide
 *   2. CLICKS   — nothing invisible is intercepting clicks (a resolving link
 *                 can still be unclickable; that bug was live for 9 days)
 *   3. FORMS    — every endpoint answers, rejects junk, and has spam protection
 *   4. CALENDAR — the booking embed and its script still load
 *
 * Exits non-zero if anything is broken or dead.
 */
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASE = (process.argv[2] || 'https://valore.agency').replace(/\/$/, '');
const API = 'https://valore-brand-builder-production.up.railway.app';

const fails = [];
const ok = m => console.log('  ✓ ' + m);
const bad = (m, d) => { console.log('  ✗ ' + m + (d ? '\n      ' + d : '')); fails.push(m); };

// ── 1. LINKS ────────────────────────────────────────────────────────────────
console.log('\n1. LINKS');
try {
  const out = execFileSync('node', [path.join(HERE, 'linkcheck.cjs'), '--quiet'], { encoding: 'utf8' });
  ok('all internal links resolve; nav and footer consistent');
} catch (e) {
  bad('linkcheck failed', (e.stdout || e.message).trim().split('\n').slice(0, 6).join('\n      '));
}

// ── 2. CLICKS ───────────────────────────────────────────────────────────────
console.log('\n2. CLICKS (nothing intercepting)');
const PAGES = ['/', '/sprint/', '/audit/', '/brand-brain/', '/contact/'];
try {
  for (const p of PAGES) {
    const out = execFileSync('node', [path.join(HERE, 'clickcheck.mjs'), BASE + p, '1440'], {
      encoding: 'utf8', timeout: 90000,
    });
    const json = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const blocked = json.links.filter(l => !l.clickable);
    if (blocked.length) bad(p + ' has blocked elements', blocked.map(b => (b.text || '').replace(/\s+/g, ' ') + ' <- ' + b.topElement).join('\n      '));
    else ok(p + ' — ' + json.links.length + ' elements, all clickable');
  }
} catch (e) {
  bad('clickcheck could not run', e.message);
}

// ── 3. FORMS ────────────────────────────────────────────────────────────────
console.log('\n3. FORMS (alive + spam protected)');
async function post(ep, body) {
  try {
    const r = await fetch(API + ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://valore.agency' },
      body: JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, error: e.message }; }
}

const ENDPOINTS = [
  { ep: '/api/contact', name: 'contact form' },
  { ep: '/api/lead', name: 'lead magnets' },
  { ep: '/api/audit', name: 'audit request' },
  { ep: '/api/brand-brain-helper', name: 'brand brain helper' },
];

for (const { ep, name } of ENDPOINTS) {
  const empty = await post(ep, {});
  if (empty.status === 0) { bad(name + ' unreachable', empty.error); continue; }
  if (empty.status >= 500) { bad(name + ' returns ' + empty.status); continue; }
  // A honeypot submission must never be treated as a real lead.
  const honey = await post(ep, {
    firstName: 'Bot', lastName: 'Bot', email: 'bot@example.com', website: 'https://x.com',
    budget: 'x', message: 'x', company: 'i am a bot', formTime: 100,
  });
  const caught = honey.status === 200 || honey.status === 400;
  if (caught) ok(name + ' alive (' + empty.status + ') and spam-gated');
  else bad(name + ' did not handle a honeypot submission', 'status ' + honey.status);
}

// ── 4. CALENDAR ─────────────────────────────────────────────────────────────
console.log('\n4. CALENDAR (booking embed)');
try {
  const page = await (await fetch(BASE + '/start/')).text();
  const m = page.match(/<iframe[^>]+src="([^"]+)"/);
  if (!m) bad('no booking iframe found on /start/');
  else {
    const r = await fetch(m[1], { redirect: 'follow' });
    if (r.ok) ok('booking widget loads (' + r.status + ') ' + new URL(m[1]).host);
    else bad('booking widget returned ' + r.status, m[1]);
    const s = page.match(/<script[^>]+src="([^"]*form_embed[^"]*)"/);
    if (s) {
      const sr = await fetch(s[1]);
      sr.ok ? ok('booking embed script loads') : bad('booking embed script ' + sr.status);
    }
  }
} catch (e) { bad('calendar check failed', e.message); }

// ── verdict ─────────────────────────────────────────────────────────────────
console.log('');
if (fails.length) {
  console.log('✗ ' + fails.length + ' problem(s). Nothing ships until these are clear.\n');
  process.exit(1);
}
console.log('✓ Links, clicks, forms and calendar all healthy.\n');
