#!/usr/bin/env node
/**
 * Reads every blog/<slug>/index.html, extracts metadata, and regenerates:
 *   1. sitemap.xml      (core pages + all blog posts, newest first)
 *   2. blog-grid.html   (the full card grid for blog/index.html)
 *
 * Metadata is pulled from the real on-page elements so nothing is fabricated:
 *   - tag      <span class="post-header__tag">
 *   - title    <h1 class="post-header__title">
 *   - excerpt  <p class="post-header__subtitle">
 *   - date     <meta property="article:published_time">
 *   - meta row <div class="post-meta"> (for the "X min read" + display date)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const BASE = 'https://valore.agency';

const grab = (re, html) => { const m = html.match(re); return m ? m[1].trim() : ''; };
const decode = s => s.replace(/&amp;/g, '&'); // for sorting/comparison only

const slugs = fs.readdirSync(BLOG, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(slug => fs.existsSync(path.join(BLOG, slug, 'index.html'))); // skip empty stub folders

const emptyStubs = fs.readdirSync(BLOG, { withFileTypes: true })
  .filter(d => d.isDirectory() && !fs.existsSync(path.join(BLOG, d.name, 'index.html')))
  .map(d => d.name);

const posts = slugs.map(slug => {
  const html = fs.readFileSync(path.join(BLOG, slug, 'index.html'), 'utf8');
  const tag = grab(/<span class="post-header__tag">([\s\S]*?)<\/span>/, html);
  const title = grab(/<h1 class="post-header__title">([\s\S]*?)<\/h1>/, html);
  const excerpt = grab(/<p class="post-header__subtitle">([\s\S]*?)<\/p>/, html);
  const date = grab(/<meta property="article:published_time" content="([^"]+)"/, html);
  const ogTitle = grab(/<meta property="og:title" content="([^"]+)"/, html);
  // display date + read time from the post-meta row
  const metaItems = [...html.matchAll(/<span class="post-meta__item">([\s\S]*?)<\/span>/g)].map(m => m[1].trim());
  const displayDate = metaItems[1] || '';
  const readTime = metaItems[2] || '';
  return { slug, tag, title, excerpt, date, ogTitle, displayDate, readTime };
}).sort((a, b) => (b.date || '').localeCompare(a.date || '')); // newest first

// ---- 1. sitemap.xml ----
const corePages = [
  { loc: `${BASE}/`, freq: 'monthly', pri: '1.0', img: 'Valore: Fractional Brand Managers' },
  { loc: `${BASE}/about/`, freq: 'monthly', pri: '0.8' },
  { loc: `${BASE}/services/`, freq: 'monthly', pri: '0.9' },
  { loc: `${BASE}/process/`, freq: 'monthly', pri: '0.8' },
  { loc: `${BASE}/case-study/`, freq: 'monthly', pri: '0.8' },
  { loc: `${BASE}/case-study/b2b-virtual-services/`, freq: 'monthly', pri: '0.7' },
  { loc: `${BASE}/brand-assessment/`, freq: 'monthly', pri: '0.8' },
  { loc: `${BASE}/marketing-cost-calculator/`, freq: 'monthly', pri: '0.8' },
  { loc: `${BASE}/pricing-readiness/`, freq: 'monthly', pri: '0.8' },
  { loc: `${BASE}/contact/`, freq: 'monthly', pri: '0.6' },
  { loc: `${BASE}/blog/`, freq: 'weekly', pri: '0.7' },
];
const today = new Date().toISOString().slice(0, 10);

const coreXml = corePages.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.pri}</priority>${p.img ? `
    <image:image>
      <image:loc>${BASE}/assets/og-image.jpg</image:loc>
      <image:title>${p.img}</image:title>
    </image:image>` : ''}
  </url>`).join('\n');

const postXml = posts.map(p => `  <url>
    <loc>${BASE}/blog/${p.slug}/</loc>
    <lastmod>${p.date || today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${BASE}/assets/og-image.jpg</image:loc>
      <image:title>${(p.ogTitle || p.title)}</image:title>
    </image:image>
  </url>`).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Core pages -->
${coreXml}

  <!-- Blog posts — ${posts.length} total, newest first -->
${postXml}

</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

// ---- 2. blog-grid.html ----
const cards = posts.map(p => `                <a href="/blog/${p.slug}/" class="blog-card">
                    <span class="blog-card__tag">${p.tag}</span>
                    <h2 class="blog-card__title">${p.title}</h2>
                    <p class="blog-card__excerpt">${p.excerpt}</p>
                    <span class="blog-card__meta">${p.displayDate} &middot; ${p.readTime}</span>
                </a>`).join('\n\n');
fs.writeFileSync(path.join(__dirname, 'blog-grid.html'), cards, 'utf8');

// ---- 3. blog-schema.html (Blog + ItemList + Breadcrumb for blog/index.html) ----
const itemList = posts.map((p, i) => `        {
          "@type": "ListItem",
          "position": ${i + 1},
          "url": "${BASE}/blog/${p.slug}/",
          "name": ${JSON.stringify(p.title)}
        }`).join(',\n');

const blogSchema = `    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": "${BASE}/blog/#blog",
      "name": "Valore Blog",
      "description": "Ideas on brand strategy, visibility, and what it takes to become THE BRAND in your market.",
      "url": "${BASE}/blog/",
      "publisher": { "@id": "${BASE}/#organization" }
    }
    </script>

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": ${posts.length},
      "itemListElement": [
${itemList}
      ]
    }
    </script>

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "${BASE}/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "${BASE}/blog/" }
      ]
    }
    </script>
`;
fs.writeFileSync(path.join(__dirname, 'blog-schema.html'), blogSchema, 'utf8');

// ---- 3b. inject the grid + schema straight into blog/index.html ----
// blog/index.html carries the rendered grid and JSON-LD inline, so refresh
// both in place every build. This keeps the daily workflow to one command:
// add posts, run this script, commit.
const indexPath = path.join(BLOG, 'index.html');
if (fs.existsSync(indexPath)) {
  let index = fs.readFileSync(indexPath, 'utf8');
  let injected = 0;

  // Grid: replace the inner cards (cards contain no <div>, so the first
  // </div> after the opener is the grid's own close).
  const gridRe = /<div class="blog-grid">[\s\S]*?<\/div>/;
  if (gridRe.test(index)) {
    index = index.replace(gridRe, `<div class="blog-grid">\n${cards}\n            </div>`);
    injected++;
  }

  // Schema: the JSON-LD block sits between the stylesheet link and the gtag
  // comment. Swap it for the freshly built Blog + ItemList + Breadcrumb.
  const schemaRe = /(<link rel="stylesheet" href="\/css\/style\.css">\r?\n)[\s\S]*?(\r?\n {4}<!-- Google tag)/;
  if (schemaRe.test(index)) {
    index = index.replace(schemaRe, `$1\n${blogSchema.trimEnd()}\n$2`);
    injected++;
  }

  fs.writeFileSync(indexPath, index, 'utf8');
  console.log(`Injected into blog/index.html (${injected}/2 regions updated).`);
}

// ---- 4. feed.xml (RSS 2.0 — newest first, for Medium import / readers / automation) ----
const rfc822 = d => d ? new Date(`${d}T12:00:00Z`).toUTCString() : new Date().toUTCString();
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rssItems = posts.map(p => `    <item>
      <title>${xmlEsc(p.title)}</title>
      <link>${BASE}/blog/${p.slug}/</link>
      <guid isPermaLink="true">${BASE}/blog/${p.slug}/</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${xmlEsc(p.excerpt)}</description>
    </item>`).join('\n');
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Valore Blog</title>
    <link>${BASE}/blog/</link>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Ideas on brand strategy, visibility, and what it takes to become THE BRAND in your market.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, 'feed.xml'), feed, 'utf8');

console.log(`Parsed ${posts.length} posts.`);
console.log(`Wrote feed.xml (${posts.length} items).`);
console.log(`Wrote sitemap.xml (${corePages.length} core + ${posts.length} posts).`);
console.log(`Wrote scripts/blog-grid.html (${posts.length} cards).`);
const missing = posts.filter(p => !p.date || !p.title || !p.excerpt);
if (missing.length) console.log('WARN missing fields:', missing.map(m => m.slug).join(', '));
console.log(`\nSkipped ${emptyStubs.length} empty stub folders (no index.html):`);
console.log(emptyStubs.join(', '));
