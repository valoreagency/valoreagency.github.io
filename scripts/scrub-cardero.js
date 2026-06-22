#!/usr/bin/env node
/**
 * Remove the company name "Cardero Clothing" and the identifying geography from
 * the blog author bios (and anywhere else it appears). Keeps "Derek" in the blog.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAIRS = [
  ['Derek founded Cardero Clothing in 2015 and spent a decade building one of the most recognised premium custom menswear brands in the Fraser Valley and Lower Mainland of British Columbia.',
   'Derek spent a decade building one of the most recognised premium custom menswear brands in its market.'],
  ['Derek founded Cardero Clothing in 2015 and spent a decade building one of the most recognized premium custom menswear brands in the Fraser Valley and Lower Mainland of British Columbia.',
   'Derek spent a decade building one of the most recognized premium custom menswear brands in its market.'],
  ['Cardero Clothing', 'a premium menswear brand'],
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
console.log(`Scrubbed "Cardero" in ${files} files (${hits} replacements).`);
const left = walk(ROOT).filter(f => fs.readFileSync(f, 'utf8').includes('Cardero'));
console.log(left.length ? 'STILL contains Cardero: ' + left.map(f => path.relative(ROOT, f)).join(', ') : 'No "Cardero" left anywhere.');
