#!/usr/bin/env node
/**
 * One-off: replace the transactional "Book a Discovery Call" CTA with the more
 * premium "Start the Conversation" across every page (nav buttons, page CTAs,
 * blog CTAs), rewrite the prose CTA openers to match, and drop the word "Free"
 * from the footer Tools label. Idempotent — the new strings do not re-match.
 * Longest phrases are replaced first so nothing is half-matched.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const REPLACEMENTS = [
  // Prose CTA openers (longest first) -> sentence case
  ["Book a free 30-minute discovery call", "Start the conversation"],
  ["Book a 30-minute brand strategy discovery call", "Start the conversation"],
  ["Book a 30-minute discovery call", "Start the conversation"],
  ["Book a 30-minute call", "Start the conversation"],
  ["Book a discovery call", "Start the conversation"],
  // Button / nav label -> title case
  ["Book a Discovery Call", "Start the Conversation"],
  // Footer tools label -> drop "Free"
  ['footer__tools-label">Free Tools<', 'footer__tools-label">Tools<'],
];

function walk(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["scripts", ".git", "assets", "css", "js"].includes(e.name)) continue;
      files = files.concat(walk(full));
    } else if (e.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  for (const [a, b] of REPLACEMENTS) html = html.split(a).join(b);
  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changed++;
  }
}
console.log(`CTA + footer label updated in ${changed} files.`);
