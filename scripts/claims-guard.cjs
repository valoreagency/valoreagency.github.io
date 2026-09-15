// scripts/claims-guard.cjs
//
// Refuses the one claim we have had to sweep out four times: that a call, a
// page, an email or a post comes without an offer. There is always an offer.
// (Valore and Cardero brand brains: the pitch rule.)
//
// Why a guard and not another sweep: the claim kept coming back through
// generators and scheduled posts that publish from a GitHub Action with nobody
// reading them. So the build itself now refuses to run.
//
// The patterns are assembled from parts on purpose, so that a plain text search
// of the repo for the claim only ever turns up a real violation, never this file.
//
//   node scripts/claims-guard.cjs            scan the whole repo, exit 1 on a hit
//   require('./claims-guard.cjs').findClaims(text)   use from another script

const fs = require('fs');
const path = require('path');

const W = 'pi' + 'tch';
const APOS = "['’]";
const SALES = '(?:sales\\s+)?';
const PATTERNS = [
  ['no-' + W,          new RegExp('\\bno[\\s-]+' + SALES + W + '(?:es)?\\b', 'i')],
  ['not-a-' + W,       new RegExp('\\bnot\\s+a\\s+' + SALES + W + '\\b', 'i')],
  ['isnt-a-' + W,      new RegExp('\\bisn' + APOS + '?t\\s+a\\s+' + SALES + W + '\\b', 'i')],
  ['without-a-' + W,   new RegExp('\\bwithout\\s+a\\s+' + SALES + W + '\\b', 'i')],
  ['never-a-' + W,     new RegExp('\\bnever\\s+a\\s+' + SALES + W + '\\b', 'i')],
  [W + '-free',        new RegExp('\\b' + W + '[\\s-]*free\\b', 'i')],
  ['not-a-sales-call', new RegExp('\\bnot\\s+a\\s+sales\\s+call\\b', 'i')],
  ['no-hard-sell',     new RegExp('\\bno\\s+hard\\s+sell\\b', 'i')],
];

// Match on visible text, so a claim split across tags is still caught and a
// class name or URL never trips it.
function visibleText(src) {
  return String(src)
    .replace(/<script[\s\S]*?<\/script>/gi, m => ' ' + m.replace(/<[^>]+>/g, ' ') + ' ') // JSON-LD FAQ text counts
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/\s+/g, ' ');
}

function findClaims(src) {
  const text = visibleText(src);
  const hits = [];
  for (const [name, re] of PATTERNS) {
    const g = new RegExp(re.source, 'gi');
    let m;
    while ((m = g.exec(text))) {
      const a = Math.max(0, m.index - 60), b = Math.min(text.length, m.index + m[0].length + 60);
      hits.push({ rule: name, match: m[0], context: text.slice(a, b).trim() });
    }
  }
  return hits;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.github']);
const SCAN_EXT = new Set(['.html', '.xml', '.md', '.txt', '.json']);
const SELF = path.resolve(__filename);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(path.extname(name)) || name.endsWith('.cjs') || name.endsWith('.js') || name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

function scanRepo(root, { exclude = [], only = null } = {}) {
  const found = [];
  const norm = p => p.split(path.sep).join('/');
  const skip = new Set(exclude.map(norm));
  const files = only ? only.map(p => path.join(root, p)).filter(p => fs.existsSync(p)) : walk(root);
  for (const f of files) {
    if (path.resolve(f) === SELF) continue;
    if (skip.has(norm(path.relative(root, f)))) continue;
    const hits = findClaims(fs.readFileSync(f, 'utf8'));
    for (const h of hits) found.push({ file: path.relative(root, f), ...h });
  }
  return found;
}

function report(found) {
  console.error('\n✗ OFFER-CLAIM GUARD: the pitch rule is broken in ' + found.length + ' place' + (found.length === 1 ? '' : 's') + '.');
  console.error('  There is always an offer. Never promise or imply that a call, page, email or post comes without one.\n');
  for (const f of found) console.error('  ' + f.file + '\n    …' + f.context + '…\n');
}

module.exports = { findClaims, scanRepo, report };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const found = scanRepo(root);
  if (found.length) { report(found); process.exit(1); }
  console.log('✓ Offer-claim guard: no page, post, feed or generator promises a call without an offer.');
}
