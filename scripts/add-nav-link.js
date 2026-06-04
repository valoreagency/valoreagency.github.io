#!/usr/bin/env node
/**
 * One-off: insert a "Case Study" link into the top nav of every page,
 * placed between Process and Blog. Idempotent — skips files already updated.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG_LINK = '                <a href="/blog/" class="nav__link"';
const mkLink = current =>
  `                <a href="/case-study/" class="nav__link"${current ? ' aria-current="page"' : ''}>Case Study</a>\n`;

function walk(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['scripts', '.git', 'assets', 'css', 'js'].includes(e.name)) continue;
      files = files.concat(walk(full));
    } else if (e.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

let updated = 0, skipped = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('class="nav__link">Case Study') || html.includes('class="nav__link" aria-current="page">Case Study')) {
    skipped++;
    continue;
  }
  if (!html.includes(BLOG_LINK)) { skipped++; continue; } // no standard nav (e.g. partials)
  const isCaseStudy = path.basename(path.dirname(file)) === 'case-study';
  html = html.replace(BLOG_LINK, mkLink(isCaseStudy) + BLOG_LINK);
  fs.writeFileSync(file, html, 'utf8');
  updated++;
}
console.log(`Nav updated: ${updated} files, skipped: ${skipped}`);
