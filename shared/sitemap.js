/**
 * Sitemap generation, shared by the Worker and the static build so both emit
 * byte-identical XML. Covers pages, every published post/video, category
 * listings, and the image + video extensions Google uses for rich results.
 */

import { CATEGORIES, isMirrorPair } from './taxonomy.js';
import { SITE_ORIGIN, categoryUrl, contentUrl, hasCategoryHub, STATIC_PATHS } from './urls.js';
import { isVideoItem, videoSitemapBlock } from './video.js';

function esc(value) {
  return String(value ?? '').replace(/[<>&'"]/g, (char) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]
  );
}

function isoDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function absolute(url, origin) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}/${value.replace(/^\//, '')}`;
}

function urlEntry({ loc, lastmod, changefreq, priority, extra = '' }) {
  return [
    '  <url>',
    `    <loc>${esc(loc)}</loc>`,
    lastmod ? `    <lastmod>${esc(lastmod)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    extra,
    '  </url>'
  ]
    .filter(Boolean)
    .join('\n');
}

function wrap(entries, namespaces = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${namespaces}>
${entries.join('\n')}
</urlset>
`;
}

/** Static, hand-written pages. */
export function pagesSitemap(origin = SITE_ORIGIN, lastmod = new Date().toISOString()) {
  const entries = [
    { path: STATIC_PATHS.home, priority: '1.0', changefreq: 'daily' },
    { path: STATIC_PATHS.watch, priority: '0.9', changefreq: 'daily' },
    { path: STATIC_PATHS.blog, priority: '0.9', changefreq: 'daily' },
    { path: STATIC_PATHS.gallery, priority: '0.8', changefreq: 'weekly' },
    { path: STATIC_PATHS.loveNotes, priority: '0.7', changefreq: 'daily' },
    { path: STATIC_PATHS.wiki, priority: '0.7', changefreq: 'monthly' },
    { path: STATIC_PATHS.about, priority: '0.6', changefreq: 'monthly' },
    { path: STATIC_PATHS.contact, priority: '0.5', changefreq: 'yearly' },
    { path: STATIC_PATHS.editorial, priority: '0.4', changefreq: 'yearly' },
    { path: STATIC_PATHS.privacy, priority: '0.3', changefreq: 'yearly' },
    { path: STATIC_PATHS.terms, priority: '0.3', changefreq: 'yearly' }
  ].map(({ path, priority, changefreq }) =>
    urlEntry({ loc: `${origin}${path}`, lastmod: isoDate(lastmod), changefreq, priority })
  );
  return wrap(entries);
}

/** Every category and subcategory listing. */
export function categoriesSitemap(origin = SITE_ORIGIN, lastmod = new Date().toISOString()) {
  const entries = [];
  for (const category of CATEGORIES) {
    // Gallery and Blog are listed by pagesSitemap as their hubs; adding
    // /c/gallery/ here as well would put one section in twice.
    if (!hasCategoryHub(category.name)) {
      entries.push(
        urlEntry({
          loc: categoryUrl(category.name, '', origin),
          lastmod: isoDate(lastmod),
          changefreq: 'daily',
          priority: '0.8'
        })
      );
    }
    for (const sub of category.subcategories) {
      // Where two categories list each other the intersection has two URLs.
      // Only the canonical one belongs in the sitemap; the mirror is noindex.
      if (isMirrorPair(category.name, sub)) continue;
      entries.push(
        urlEntry({
          loc: categoryUrl(category.name, sub, origin),
          lastmod: isoDate(lastmod),
          changefreq: 'weekly',
          priority: '0.6'
        })
      );
    }
  }
  return wrap(entries);
}

/** Published posts and videos, with video metadata attached where relevant. */
export function contentSitemap(items = [], origin = SITE_ORIGIN) {
  const entries = items
    .filter((item) => Number(item.published) === 1 && Number(item.indexable) !== 0)
    .map((item) => {
      const loc = item.path
        ? `${origin}${item.path}`
        : item.canonical_url || contentUrl(item, origin);
      const image = absolute(item.og_image || item.image, origin);
      const parts = [];
      if (image) {
        parts.push(
          `    <image:image>\n      <image:loc>${esc(image)}</image:loc>\n      <image:title>${esc(item.title)}</image:title>\n    </image:image>`
        );
      }
      if (isVideoItem(item)) {
        const block = videoSitemapBlock(item, origin, esc);
        if (block) parts.push(block);
      }
      return urlEntry({
        loc,
        lastmod: isoDate(item.modified_at || item.published_at),
        changefreq: 'weekly',
        priority: item.type === 'featured' ? '0.9' : '0.7',
        extra: parts.join('\n')
      });
    });

  return wrap(entries, `
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"`);
}

/** Gallery images get their own sitemap so image search can pick them up. */
export function imagesSitemap(gallery = [], origin = SITE_ORIGIN) {
  const byPage = new Map();
  for (const item of gallery) {
    const loc = `${origin}${STATIC_PATHS.gallery}`;
    const list = byPage.get(loc) || [];
    list.push(item);
    byPage.set(loc, list);
  }
  const entries = [...byPage.entries()].map(([loc, items]) =>
    urlEntry({
      loc,
      lastmod: isoDate(items[0]?.updated_at),
      changefreq: 'weekly',
      priority: '0.7',
      extra: items
        .slice(0, 1000)
        .map(
          (item) =>
            `    <image:image>\n      <image:loc>${esc(absolute(item.image_url, origin))}</image:loc>\n      <image:title>${esc(item.title)}</image:title>\n      <image:caption>${esc(item.caption || item.alt_text)}</image:caption>\n    </image:image>`
        )
        .join('\n')
    })
  );
  return wrap(entries, `
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`);
}

/** Index that ties the individual sitemaps together. */
export function sitemapIndex(origin = SITE_ORIGIN, lastmod = new Date().toISOString()) {
  const files = [
    'sitemap-pages.xml',
    'sitemap-categories.xml',
    'sitemap-content.xml',
    'sitemap-images.xml'
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files
  .map(
    (file) =>
      `  <sitemap>\n    <loc>${origin}/${file}</loc>\n    <lastmod>${isoDate(lastmod)}</lastmod>\n  </sitemap>`
  )
  .join('\n')}
</sitemapindex>
`;
}

/** Strip the wrapper so a sub-document's <url> blocks can be concatenated. */
function unwrap(doc) {
  return doc.replace(/^[\s\S]*?<urlset[^>]*>\n?/, '').replace(/<\/urlset>\s*$/, '');
}

/**
 * Single-file sitemap, used by the Worker's own /sitemap.xml route.
 *
 * Every URL must appear exactly once. That was free while these were four
 * separate files, but merged into one document /gallery/ arrives twice —
 * as a plain page and again carrying its image list. The richer entry wins.
 */
export function fullSitemap({ items = [], gallery = [], origin = SITE_ORIGIN } = {}) {
  const imageEntries = unwrap(imagesSitemap(gallery, origin));
  const claimed = new Set([...imageEntries.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

  const merged = [pagesSitemap(origin), categoriesSitemap(origin), contentSitemap(items, origin)]
    .map(unwrap)
    .join('')
    .replace(/ {2}<url>[\s\S]*?<\/url>\n/g, (block) => {
      const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
      return loc && claimed.has(loc) ? '' : block;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${merged}${imageEntries}</urlset>
`;
}
