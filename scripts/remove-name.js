#!/usr/bin/env node
/**
 * Remove the founder's personal name from all customer-facing copy and metadata.
 * Brand-as-actor: "Valore" replaces "Derek". Bios are genericized (Cardero
 * dropped too). Ordered most-specific first so pronoun-bearing sentences are
 * fixed before the generic phrase swaps run.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAIRS = [
  // --- genericized author bio (also drops the Cardero / personal reference) ---
  [`Derek founded Cardero Clothing in 2015 and spent a decade building one of the most recognised premium custom menswear brands in the Fraser Valley and Lower Mainland of British Columbia. Along the way, he kept seeing the same gap in business after business: strong companies, excellent work, and brands that did not reflect any of it. Valore is built to close that gap.`,
   `Valore was built by a founder who grew a premium menswear brand from the ground up over a decade. The same gap kept appearing in business after business: strong companies, excellent work, and brands that did not reflect any of it. Valore exists to close that gap.`],

  // --- bespoke sentences with pronouns / story (must run before generic swaps) ---
  [`You work directly with Derek, and you get his full attention on your business.`,
   `You work directly with Valore, and you get our full attention on your business.`],
  [`Valore is built on that experience. Derek does not come in with a playbook. He comes in with the right questions, a clear pattern for what is missing, and a roadmap for what to build next.`,
   `Valore is built on that experience. It does not come in with a playbook. It comes in with the right questions, a clear pattern for what is missing, and a roadmap for what to build next.`],
  [`Derek Burbidge built a premium custom menswear brand from the ground up and grew it into a recognized name over the course of a decade. In that time he worked alongside high-end brands, seven and eight-figure businesses, and owner-led companies at every stage of growth.`,
   `Valore was built by a founder who grew a premium menswear brand from the ground up into a recognized name over a decade. That work spanned high-end brands, seven and eight-figure businesses, and owner-led companies at every stage of growth.`],
  [`Valore exists because Derek Burbidge kept seeing the same gap in business after business.`,
   `Valore exists because its founder kept seeing the same gap in business after business.`],
  [`Along the way, Derek spent time with other business owners.`,
   `Along the way came time spent with other business owners.`],
  [`<meta property="og:title" content="About Derek Burbidge | Brand Strategy Consultant | Valore">`,
   `<meta property="og:title" content="About Valore | Brand Strategy Consultancy">`],
  [`content="Built by someone who has actually done this. The story behind Valore and fractional brand manager Derek Burbidge.">`,
   `content="Built by people who have actually done this. The story behind Valore.">`],

  // --- structured data / bylines ---
  [`<cite>Derek Burbidge, Founder</cite>`, `<cite>Founder, Valore</cite>`],
  [`<span class="post-meta__item">Derek Burbidge</span>`, `<span class="post-meta__item">Valore</span>`],
  [`<p class="post-author__name">Derek Burbidge</p>`, `<p class="post-author__name">Valore</p>`],
  [`content="Derek Burbidge"`, `content="Valore"`],
  [`"name": "Derek Burbidge"`, `"name": "Valore"`],
  [`Written by Derek Burbidge.`, `From the Valore team.`],

  // --- generic phrase swaps (run last) ---
  [`You work directly with Derek.`, `You work directly with Valore.`],
  [`with Derek`, `with Valore`],
  [`Derek will `, `Valore will `],
  [`Derek reviews `, `Valore reviews `],
  [`Derek helps `, `Valore helps `],
  [`Derek stays involved`, `Valore stays involved`],
  [`Derek is your brand director`, `Valore is your brand director`],
  [`From Derek.`, `From Valore.`],
];

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Policy: the founder's name stays on the About page and the blog;
      // remove only from the other conversion pages.
      if (['scripts', '.git', 'assets', 'css', 'js', 'blog', 'about'].includes(e.name)) continue;
      out = out.concat(walk(full));
    } else if (e.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

let filesChanged = 0, totalReplacements = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  for (const [find, repl] of PAIRS) {
    html = html.split(find).join(repl);
  }
  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    filesChanged++;
    // rough count
    const c = before.split(/Derek/).length - html.split(/Derek/).length;
    totalReplacements += c;
  }
}
console.log(`Files changed: ${filesChanged}, "Derek" mentions removed: ${totalReplacements}`);
