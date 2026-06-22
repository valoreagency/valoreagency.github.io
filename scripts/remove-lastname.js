#!/usr/bin/env node
/**
 * Remove the founder's last name from displayed text: "Derek Burbidge" -> "Derek".
 * Leaves the cal.com booking handle, the image filename, and the schema @id
 * fragment untouched (functional/internal, not shown as a name).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

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
  const n = html.split('Derek Burbidge').length - 1;
  if (n) {
    html = html.split('Derek Burbidge').join('Derek');
    fs.writeFileSync(file, html, 'utf8');
    files++; hits += n;
  }
}
console.log(`Replaced "Derek Burbidge" -> "Derek" in ${files} files (${hits} occurrences).`);
const left = walk(ROOT).filter(f => /Derek Burbidge/.test(fs.readFileSync(f, 'utf8')));
console.log(left.length ? 'Still has full name: ' + left.join(', ') : 'No displayed "Derek Burbidge" left.');
