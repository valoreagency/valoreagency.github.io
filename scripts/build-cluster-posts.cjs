#!/usr/bin/env node
/**
 * build-cluster-posts.cjs
 * Reads one or more "full content" JSON files (the same schema used for the
 * Valore content review docs) and emits a complete blog/<slug>/index.html for
 * every day whose url points at /blog/. Pillars (non /blog/ urls) are skipped.
 *
 * Each post gets its article:published_time from the SCHEDULE map below (the
 * 3/day interleaved drip). build-blog.js excludes future-dated posts from the
 * grid/sitemap/feed, so pages go "live" on their scheduled day.
 *
 * Usage:
 *   node scripts/build-cluster-posts.cjs <content1.json> [content2.json ...]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const CAL = 'https://cal.com/derek-burbidge-msgkca/30brand';

// --- 3/day interleaved drip schedule (slug -> YYYY-MM-DD) ---
const SCHEDULE = {
  // Day 0  2026-06-24
  'premium-vs-luxury-menswear': '2026-06-24', 'sell-outcomes-not-features-b2b': '2026-06-24', 'busy-vs-growing': '2026-06-24',
  // Day 1  2026-06-25
  'signs-menswear-brand-underpriced': '2026-06-25', 'value-based-pricing-b2b-services': '2026-06-25', 'consistency-beats-creativity': '2026-06-25',
  // Day 2  2026-06-26
  'who-should-menswear-brand-compare-to': '2026-06-26', 'b2b-ideal-client-criteria-say-no': '2026-06-26', 'one-channel-stool-framework': '2026-06-26',
  // Day 3  2026-06-27
  'premium-menswear-without-heritage': '2026-06-27', 'beyond-referrals-b2b-second-channel': '2026-06-27', 'reactive-marketing': '2026-06-27',
  // Day 4  2026-06-28
  'make-menswear-brand-look-premium': '2026-06-28', 'raise-b2b-fees-without-losing-clients': '2026-06-28', 'what-strong-brands-have': '2026-06-28',
  // Day 5  2026-06-29
  'premium-packaging-menswear': '2026-06-29', 'b2b-premium-proof-case-studies': '2026-06-29', 'owner-is-the-brand': '2026-06-29',
  // Day 6  2026-06-30
  'menswear-fitting-experience': '2026-06-30', 'niche-down-b2b-service-premium': '2026-06-30', 'when-to-invest-brand-strategy': '2026-06-30',
  // Day 7  2026-07-01
  'raise-menswear-prices-without-losing-customers': '2026-07-01', 'b2b-positioning-against-cheaper-competitors': '2026-07-01', 'why-growing-businesses-plateau': '2026-07-01',
  // Day 8  2026-07-02
  'how-premium-menswear-brands-get-found': '2026-07-02', 'confidence-pricing-b2b': '2026-07-02',
  // Day 9  2026-07-03
  'one-discount-undo-premium-menswear': '2026-07-03', 'b2b-brand-behind-the-service': '2026-07-03',
};

const CLUSTER_META = {
  'Menswear':         { tag: 'Premium Menswear', pillarUrl: '/menswear/premium-brand-guide/',     pillarTitle: 'How to Build a Premium Menswear Brand', pillarTag: 'Premium Menswear' },
  'B2B Services':     { tag: 'Premium B2B',      pillarUrl: '/b2bservices/premium-brand-guide/',   pillarTitle: 'How to Build a Premium B2B Service Brand', pillarTag: 'Premium B2B' },
  'Brand Foundations':{ tag: 'Brand Strategy',   pillarUrl: null,                                  pillarTitle: null, pillarTag: null },
};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonEsc = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const displayDate = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[m - 1]} ${d}, ${y}`;
};
const slugFromUrl = url => { const m = url.match(/\/blog\/([^/]+)\//); return m ? m[1] : null; };
const readTime = day => {
  let words = 0;
  (day.takeaways || []).forEach(t => words += t.split(/\s+/).length);
  (day.body || []).forEach(s => (s.p || []).forEach(p => words += p.split(/\s+/).length));
  (day.faq || []).forEach(f => words += (f.q + ' ' + f.a).split(/\s+/).length);
  return Math.max(4, Math.round(words / 200)) + ' min read';
};

function render(day, allBySlug) {
  const slug = slugFromUrl(day.url);
  const date = SCHEDULE[slug];
  if (!date) { console.log(`  WARN no schedule date for ${slug}, skipping`); return null; }
  const meta = CLUSTER_META[day.cluster] || CLUSTER_META['Brand Foundations'];
  const subtitle = day.subtitle || (day.body && day.body[0] && day.body[0].p && day.body[0].p[0]) || day.blogTitle;
  const description = day.description || subtitle.slice(0, 155);
  const canonical = `https://valore.agency/blog/${slug}/`;

  // TOC + body
  const toc = (day.body || []).filter(s => s.h2).map((s, i) =>
    `                    <li><a href="#sec${i}">${esc(s.h2)}</a></li>`).join('\n');
  const bodyHtml = (day.body || []).map((s, i) => {
    const h = s.h2 ? `                <h2 id="sec${i}">${esc(s.h2)}</h2>\n` : '';
    const ps = (s.p || []).map(p => `                <p>${esc(p)}</p>`).join('\n');
    return h + ps;
  }).join('\n\n');

  // pillar internal link (cluster -> pillar)
  const pillarLine = meta.pillarUrl
    ? `\n                <p style="margin-top:1.5rem;">This is part of our complete guide on <a href="${meta.pillarUrl}">${esc(meta.pillarTitle)}</a>.</p>`
    : '';

  // takeaways
  const takeaways = (day.takeaways || []).map(t => `                    <li>${esc(t)}</li>`).join('\n');

  // FAQ (visible + schema)
  const faqVisible = (day.faq || []).map(f =>
    `                <div class="post-faq__item">\n                    <h3 class="post-faq__q">${esc(f.q)}</h3>\n                    <p class="post-faq__a">${esc(f.a)}</p>\n                </div>`).join('\n');
  const faqSchema = (day.faq || []).map(f =>
    `{"@type":"Question","name":"${jsonEsc(f.q)}","acceptedAnswer":{"@type":"Answer","text":"${jsonEsc(f.a)}"}}`).join(',');

  // related: pillar (if any) + a sibling in same cluster
  const siblings = Object.values(allBySlug).filter(d => d.cluster === day.cluster && slugFromUrl(d.url) !== slug);
  const sib = siblings[(siblings.findIndex(d => true) + 0) % (siblings.length || 1)] || null;
  const relCards = [];
  if (meta.pillarUrl) relCards.push(`                    <div class="post-related__card"><span class="post-related__tag">${esc(meta.pillarTag)}</span><a href="${meta.pillarUrl}" style="text-decoration:none;"><p class="post-related__title">${esc(meta.pillarTitle)}</p></a></div>`);
  if (sib) relCards.push(`                    <div class="post-related__card"><span class="post-related__tag">${esc(meta.tag)}</span><a href="${sib.url.replace('https://valore.agency','')}" style="text-decoration:none;"><p class="post-related__title">${esc(sib.blogTitle)}</p></a></div>`);
  while (relCards.length < 2) relCards.push(`                    <div class="post-related__card"><span class="post-related__tag">Case Study</span><a href="/case-study/" style="text-decoration:none;"><p class="post-related__title">Two Brands Taken From Standard to Premium</p></a></div>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(day.blogTitle)} | Valore</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${esc(day.blogTitle)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:image" content="https://valore.agency/assets/og-image.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="https://valore.agency/assets/og-image.jpg">
    <meta property="article:published_time" content="${date}">
    <meta property="article:author" content="Derek">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/style.css">
    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Article","headline":"${jsonEsc(day.blogTitle)}","description":"${jsonEsc(description)}","author":{"@type":"Person","name":"Derek","url":"https://valore.agency/about/"},"publisher":{"@type":"Organization","name":"Valore","url":"https://valore.agency"},"datePublished":"${date}","dateModified":"${date}","url":"${canonical}","mainEntityOfPage":{"@type":"WebPage","@id":"${canonical}"}}
    </script>
    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://valore.agency/"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://valore.agency/blog/"},{"@type":"ListItem","position":3,"name":"${jsonEsc(day.blogTitle)}","item":"${canonical}"}]}
    </script>
    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${faqSchema}]}
    </script>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-6HM2E95TD4"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-6HM2E95TD4');
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('a[href*="cal.com"]').forEach(function(el) {
          el.addEventListener('click', function() {
            gtag('event', 'discovery_call_click', { event_category: 'cta', event_label: document.title });
          });
        });
      });
    </script>
</head>
<body>
    <header class="nav">
        <div class="nav__inner">
            <a href="/" class="nav__logo"><span class="nav__logo-name">Valore</span><span class="nav__logo-sub">Fractional Brand Partner</span></a>
            <nav class="nav__links" id="navLinks" aria-label="Main navigation">
                <a href="/about/" class="nav__link">About</a>
                <a href="/services/" class="nav__link">Services</a>
                <a href="/process/" class="nav__link">Process</a>
                <a href="/case-study/" class="nav__link">Case Study</a>
                <a href="/blog/" class="nav__link" aria-current="page">Blog</a>
            </nav>
            <div class="nav__actions">
                <a href="${CAL}" class="nav__cta" target="_blank" rel="noopener noreferrer">Start the Conversation</a>
                <button class="nav__hamburger" id="navToggle" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button>
            </div>
        </div>
    </header>

    <div class="post-breadcrumb" style="margin-top:70px;">
        <div class="container">
            <ol class="post-breadcrumb__list">
                <li class="post-breadcrumb__item"><a href="/">Home</a></li>
                <li class="post-breadcrumb__sep" aria-hidden="true">/</li>
                <li class="post-breadcrumb__item"><a href="/blog/">Blog</a></li>
                <li class="post-breadcrumb__sep" aria-hidden="true">/</li>
                <li class="post-breadcrumb__item post-breadcrumb__current">${esc(day.blogTitle)}</li>
            </ol>
        </div>
    </div>

    <main>
        <div class="container container--blog">
            <header class="post-header">
                <span class="post-header__tag">${esc(meta.tag)}</span>
                <h1 class="post-header__title">${esc(day.blogTitle)}</h1>
                <p class="post-header__subtitle">${esc(subtitle)}</p>
                <div class="post-meta">
                    <span class="post-meta__item">Derek</span>
                    <span class="post-meta__sep" aria-hidden="true"></span>
                    <span class="post-meta__item">${displayDate(date)}</span>
                    <span class="post-meta__sep" aria-hidden="true"></span>
                    <span class="post-meta__item">${readTime(day)}</span>
                </div>
            </header>

            <aside class="post-takeaways" aria-label="Key takeaways">
                <span class="post-takeaways__label">Key Takeaways</span>
                <ul class="post-takeaways__list">
${takeaways}
                </ul>
            </aside>

            <nav class="post-toc" aria-label="Table of contents">
                <span class="post-toc__label">What's In This Post</span>
                <ol class="post-toc__list">
${toc}
                    <li><a href="#faq">Frequently asked questions</a></li>
                </ol>
            </nav>

            <article class="post-body">
${bodyHtml}
${pillarLine}

                <div class="post-lead-magnet">
                    <div class="post-lead-magnet__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1" stroke="#002664" stroke-width="1.25" stroke-opacity="0.6"/><line x1="8" y1="8" x2="16" y2="8" stroke="#002664" stroke-width="1.25" stroke-opacity="0.6" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="#002664" stroke-width="1.25" stroke-opacity="0.6" stroke-linecap="round"/><line x1="8" y1="16" x2="12" y2="16" stroke="#002664" stroke-width="1.25" stroke-opacity="0.6" stroke-linecap="round"/></svg></div>
                    <div class="post-lead-magnet__content">
                        <span class="post-lead-magnet__eyebrow">Free Resource</span>
                        <p class="post-lead-magnet__title">Is Your Brand Ready to Grow?</p>
                        <p class="post-lead-magnet__body">A free self-assessment for established business owners. Find out exactly where your brand stands, what is holding your growth back, and what to address first.</p>
                        <a href="/brand-assessment/" class="post-lead-magnet__cta">Get the Free Assessment</a>
                    </div>
                </div>

                <div class="post-cta-inline">
                    <h3>Ready to become the premium choice in your market?</h3>
                    <p>A 30-minute call is where this gets clear. Derek will review your brand beforehand and give you an honest read on what to fix first and what it is worth.</p>
                    <a href="${CAL}" class="btn btn--cream" target="_blank" rel="noopener noreferrer">Start the Conversation</a>
                </div>
            </article>

            <div class="post-author">
                <img class="post-author__photo" src="/assets/derek.jpg" alt="Derek, founder of Valore" width="72" height="72" loading="lazy">
                <div>
                    <p class="post-author__name">Derek</p>
                    <p class="post-author__role">Founder, Valore</p>
                    <p class="post-author__bio">Derek spent a decade building one of the most recognised premium brands in its market, then took a B2B service firm through the same climb. Now he helps other established businesses become the premium choice in their market.</p>
                </div>
            </div>

            <section class="post-faq" id="faq" aria-labelledby="faq-headline">
                <span class="post-faq__label">Frequently Asked Questions</span>
                <h2 class="post-faq__headline" id="faq-headline">Common questions</h2>
${faqVisible}
            </section>

            <section class="post-related" aria-labelledby="related-label">
                <span class="post-related__label" id="related-label">Continue Reading</span>
                <div class="post-related__grid">
${relCards.join('\n')}
                </div>
            </section>
        </div>
    </main>

    <section class="section section--navy" style="margin-top:6rem;">
        <div class="container container--narrow">
            <h2 class="section__headline section__headline--light">Ready to find out where your brand stands?</h2>
            <p class="section__body section__body--light">Start the conversation. Derek will review your brand before the call and come prepared with an honest read on where the clarity is missing and what to fix first.</p>
            <a href="${CAL}" class="btn btn--cream" target="_blank" rel="noopener noreferrer">Start the Conversation</a>
            <p class="cta-note">No pitch. No pressure. Real clarity.</p>
        </div>
    </section>

    <footer class="footer"><div class="container"><nav class="footer__tools" aria-label="Free tools"><span class="footer__tools-label">Tools</span><a href="/brand-assessment/">Brand Assessment</a><a href="/marketing-cost-calculator/">Marketing Cost Calculator</a><a href="/pricing-readiness/">Pricing Scorecard</a></nav><div class="footer__inner"><div class="footer__brand"><p class="footer__name">Valore</p><p class="footer__tagline">Fractional Brand Partner</p></div><p class="footer__copy">&copy; 2026 Valore. All rights reserved.</p></div></div></footer>
    <script>const t=document.getElementById('navToggle');const l=document.getElementById('navLinks');t.addEventListener('click',function(){const open=l.classList.toggle('is-open');t.setAttribute('aria-expanded',open);t.classList.toggle('is-active');});</script>
<script src="/js/animations.js" defer></script>
</body>
</html>
`;
}

// --- main ---
const args = process.argv.slice(2);
if (!args.length) { console.error('Usage: node build-cluster-posts.cjs <content.json> [...]'); process.exit(1); }

const allDays = [];
for (const a of args) {
  const data = JSON.parse(fs.readFileSync(a, 'utf8'));
  (data.days || []).forEach(d => allDays.push(d));
}
const allBySlug = {};
allDays.forEach(d => { const s = slugFromUrl(d.url); if (s) allBySlug[s] = d; });

let written = 0, skipped = 0;
for (const day of allDays) {
  const slug = slugFromUrl(day.url);
  if (!slug) { skipped++; continue; } // pillars / non-blog urls
  const html = render(day, allBySlug);
  if (!html) { skipped++; continue; }
  const dir = path.join(BLOG, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  written++;
  console.log(`  wrote blog/${slug}/  (${SCHEDULE[slug]})`);
}
console.log(`\nDone. Wrote ${written} posts, skipped ${skipped} (pillars / no date).`);
