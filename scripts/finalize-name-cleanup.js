#!/usr/bin/env node
/**
 * Final name cleanup in HTML: point the headshot at /assets/derek.jpg and
 * change the schema @id fragment #derek-burbidge -> #derek. (The image file
 * itself is renamed separately with git mv.)
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

let files = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.split('derek-burbidge.jpg').join('derek.jpg').split('#derek-burbidge').join('#derek');
  if (html !== before) { fs.writeFileSync(file, html, 'utf8'); files++; }
}
console.log(`Updated ${files} HTML files (image path + schema @id).`);
