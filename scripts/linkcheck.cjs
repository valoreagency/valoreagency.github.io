#!/usr/bin/env node
/**
 * scripts/linkcheck.cjs — RULE: no broken links, ever.
 *
 * Verifies every internal href/src in every .html file resolves to something
 * that actually exists on disk, and that the nav/footer are identical
 * site-wide. Run it BEFORE every commit that touches HTML.
 *
 *   node scripts/linkcheck.cjs          # check
 *   node scripts/linkcheck.cjs --quiet  # only print failures
 *
 * Exits 1 on any failure so it can gate a commit.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Does an internal path resolve to a real file?
function resolves(href) {
  let p = href.split('#')[0].split('?')[0];
  if (!p || p === '/') p = '/index.html';
  const abs = path.join(ROOT, p.replace(/^\//, ''));
  if (fs.existsSync(abs)) {
    if (fs.statSync(abs).isDirectory()) return fs.existsSync(path.join(abs, 'index.html'));
    return true;
  }
  // /foo/ -> /foo/index.html ; /foo -> /foo.html or /foo/index.html
  if (fs.existsSync(abs + '.html')) return true;
  if (fs.existsSync(path.join(abs, 'index.html'))) return true;
  return false;
}

const files = walk(ROOT);
const failures = [];
let checked = 0;

// ── 1. every internal link resolves ─────────────────────────────────────────
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const refs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/gi)].map(m => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) continue;
    if (!ref.startsWith('/')) continue; // site is absolute-path only
    checked++;
    if (!resolves(ref)) failures.push({ type: 'BROKEN LINK', file: rel, detail: ref });
  }
}

// ── 2. nav + footer identical site-wide ─────────────────────────────────────
function navSig(html) {
  const m = html.match(/<nav class="nav__links"[\s\S]*?<\/nav>/);
  if (!m) return null;
  return [...m[0].matchAll(/href="([^"]+)"[^>]*>([^<]+)</g)].map(x => `${x[2].trim()}=>${x[1]}`).join(' | ');
}
function footerSig(html) {
  const m = html.match(/<nav class="footer__tools"[\s\S]*?<\/nav>/);
  if (!m) return null;
  return [...m[0].matchAll(/href="([^"]+)"[^>]*>([^<]+)</g)].map(x => `${x[2].trim()}=>${x[1]}`).join(' | ');
}

const navs = new Map(), foots = new Map();
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const n = navSig(html); if (n) { if (!navs.has(n)) navs.set(n, []); navs.get(n).push(rel); }
  const f = footerSig(html); if (f) { if (!foots.has(f)) foots.set(f, []); foots.get(f).push(rel); }
}

function reportVariants(map, label) {
  if (map.size <= 1) return;
  const sorted = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  const [, majorityFiles] = sorted[0];
  for (const [sig, list] of sorted.slice(1)) {
    failures.push({
      type: `${label} MISMATCH`,
      file: `${list.length} file(s): ${list.slice(0, 4).join(', ')}${list.length > 4 ? ', …' : ''}`,
      detail: sig,
    });
  }
  if (!QUIET) {
    console.log(`\n  ${label} majority (${majorityFiles.length} files):\n    ${sorted[0][0]}`);
  }
}
reportVariants(navs, 'NAV');
reportVariants(foots, 'FOOTER');

// ── 3. nav cannot outgrow its breakpoint ────────────────────────────────────
// This is the bug that broke the header twice: .nav__inner is capped at 1160px
// but the hamburger used to appear only at 768px, so adding a nav link pushed
// the links into the CTA between roughly 769px and 900px. Guard the invariant.
try {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  const blocks = css.split('@media');
  let bp = null;
  for (const b of blocks) {
    if (b.includes('.nav__hamburger') && b.includes('display: flex')) {
      const m = b.match(/max-width: *([0-9]+)px/);
      if (m) bp = Math.max(bp || 0, Number(m[1]));
    }
  }
  if (bp === null) {
    failures.push({ type: 'NAV GUARD', file: 'css/style.css', detail: 'Could not find the hamburger breakpoint.' });
  } else if (bp < 1024) {
    failures.push({ type: 'NAV GUARD', file: 'css/style.css', detail: 'Hamburger breakpoint is ' + bp + 'px; must be at least 1024px or the nav overflows on tablets and small laptops.' });
  } else if (!QUIET) {
    console.log('  nav hamburger breakpoint: ' + bp + 'px (ok)');
  }
  const navCount = navs.size ? [...navs.keys()][0].split('|').length : 0;
  if (navCount > 7) {
    failures.push({ type: 'NAV GUARD', file: 'nav', detail: navCount + ' nav links. Re-run scripts/nav-overflow.mjs and raise the breakpoint before shipping.' });
  } else if (!QUIET) {
    console.log('  nav links: ' + navCount + ' (tested safe up to 7)');
  }
} catch (e) {
  failures.push({ type: 'NAV GUARD', file: 'css/style.css', detail: e.message });
}

// ── report ──────────────────────────────────────────────────────────────────
if (!QUIET) {
  console.log(`\nlinkcheck: ${files.length} html files, ${checked} internal refs checked.`);
}
if (failures.length) {
  console.log(`\n✗ ${failures.length} problem(s):\n`);
  for (const f of failures) console.log(`  [${f.type}] ${f.file}\n      ${f.detail}`);
  process.exit(1);
}
console.log('✓ No broken links. Nav and footer consistent site-wide.');
