#!/usr/bin/env node
/**
 * One-off: insert a "Free Tools" links row into the footer of every page,
 * just above the brand/copy row. Surfaces the three lead magnets site-wide
 * without cluttering the top nav. Idempotent — skips files already updated
 * and files without the standard footer.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Pretty (multi-line) footer, as used on the core pages and lead magnets.
const ANCHOR = '            <div class="footer__inner">';
const BLOCK =
`            <nav class="footer__tools" aria-label="Free tools">
                <span class="footer__tools-label">Tools</span>
                <a href="/brand-assessment/">Brand Assessment</a>
                <a href="/marketing-cost-calculator/">Marketing Cost Calculator</a>
                <a href="/pricing-readiness/">Pricing Scorecard</a>
            </nav>
`;

// Minified (single-line) footer, as used on most generated blog posts.
const MIN_ANCHOR = '<div class="footer__inner">';
const MIN_BLOCK =
'<nav class="footer__tools" aria-label="Free tools"><span class="footer__tools-label">Tools</span>' +
'<a href="/brand-assessment/">Brand Assessment</a>' +
'<a href="/marketing-cost-calculator/">Marketing Cost Calculator</a>' +
'<a href="/pricing-readiness/">Pricing Scorecard</a></nav>';

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
  if (html.includes('class="footer__tools"')) { skipped++; continue; } // already has it
  if (html.includes(ANCHOR)) {
    html = html.replace(ANCHOR, BLOCK + ANCHOR);
  } else if (html.includes(MIN_ANCHOR)) {
    html = html.replace(MIN_ANCHOR, MIN_BLOCK + MIN_ANCHOR);
  } else {
    skipped++; continue; // no standard footer
  }
  fs.writeFileSync(file, html, 'utf8');
  updated++;
}
console.log(`Footer tools added: ${updated} files, skipped: ${skipped}`);
