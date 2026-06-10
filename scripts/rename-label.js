#!/usr/bin/env node
/**
 * Swap the visible brand label "Fractional Brand Managers" -> "Fractional Brand Partner"
 * in the nav sub-label and the footer tagline only. Titles, meta, OG, and schema keep
 * "fractional brand manager" untouched, so SEO ranking for that term is preserved.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAIRS = [
  ['Fractional Brand Managers</span>', 'Fractional Brand Partner</span>'], // nav__logo-sub
  ['Fractional Brand Managers</p>', 'Fractional Brand Partner</p>'],       // footer__tagline
];

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['scripts', '.git', 'assets', 'css', 'js'].includes(e.name)) continue;
      out = out.concat(walk(full));
    } else if (e.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

let files = 0, hits = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  for (const [find, repl] of PAIRS) {
    const n = html.split(find).length - 1;
    if (n) { html = html.split(find).join(repl); hits += n; }
  }
  if (html !== before) { fs.writeFileSync(file, html, 'utf8'); files++; }
}
console.log(`Renamed label in ${files} files (${hits} occurrences).`);
