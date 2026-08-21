#!/usr/bin/env node
/**
 * Static build for the GitHub Pages site.
 *
 * 1. Writes the shared shell (head assets, schema, ticker, header, CTA, footer)
 *    into every page between its `<!--shell:x:start-->` markers.
 * 2. Pulls published content from MRF-API and pre-renders one page per item at
 *    its permanent SEO URL, plus a listing page per category and subcategory.
 * 3. Emits the sitemap set and robots.txt.
 *
 * The API step is best-effort: if the Worker cannot be reached the shell and
 * category pages are still rebuilt and the previously generated item pages are
 * left in place, so a transient API outage never ships an empty site.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHELL_REGIONS } from './lib/shell.mjs';
import { CATEGORIES, findCategory } from '../shared/taxonomy.js';
import { SITE_NAME, SITE_ORIGIN, categoryPath, contentPath } from '../shared/urls.js';
import {
  categoriesSitemap,
  contentSitemap,
  imagesSitemap,
  pagesSitemap,
  sitemapIndex
} from '../shared/sitemap.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_BASE = (process.env.MRF_API_URL || 'https://mrf-api.gadget02030.workers.dev').replace(/\/$/, '');
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', 'content-archive', 'worker', 'tests', 'scripts', 'assets']);

const esc = (value) =>
  String(value ?? '').replace(/[&<>'"]/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]
  );

const log = (...args) => console.log('[build]', ...args);

/* ------------------------------------------------------------------ shell */

/** Replace the content between `<!--shell:name:start-->` and its end marker. */
function applyShell(html, origin = SITE_ORIGIN) {
  let output = html;
  for (const [name, render] of Object.entries(SHELL_REGIONS)) {
    const pattern = new RegExp(`(<!--shell:${name}:start-->)[\\s\\S]*?(<!--shell:${name}:end-->)`, 'g');
    if (!pattern.test(output)) continue;
    pattern.lastIndex = 0;
    output = output.replace(pattern, () => `<!--shell:${name}:start-->\n${render(origin)}\n<!--shell:${name}:end-->`);
  }
  return output;
}

async function* walkHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkHtml(full);
    } else if (entry.name.endsWith('.html')) {
      yield full;
    }
  }
}

async function injectShellEverywhere() {
  let touched = 0;
  for await (const file of walkHtml(ROOT)) {
    const html = await readFile(file, 'utf8');
    const next = applyShell(html);
    if (next !== html) {
      await writeFile(file, next);
      touched += 1;
    }
  }
  log(`shell written into ${touched} page(s)`);
}

/* ------------------------------------------------------------- page shells */

function pageShell({ lang = 'en', head, bodyAttrs = '', main, scripts }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${head}
  <!--shell:head:start--><!--shell:head:end-->
  <!--shell:schema:start--><!--shell:schema:end-->
</head>
<body${bodyAttrs}>
  <a class="skip-link" href="#main">Skip to main content</a>
  <!--shell:lovestrip:start--><!--shell:lovestrip:end-->
  <!--shell:header:start--><!--shell:header:end-->

  <main id="main">
${main}
    <!--shell:cta:start--><!--shell:cta:end-->
  </main>

  <!--shell:footer:start--><!--shell:footer:end-->

  <script type="module" src="/assets/js/shell.js"></script>
${scripts}
</body>
</html>
`;
}

function seoHead({ title, description, canonical, image, type = 'website', extra = '' }) {
  const absoluteImage = image?.startsWith('http') ? image : `${SITE_ORIGIN}${image || '/assets/img/hero_red-1280.webp'}`;
  return `  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="${type}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(absoluteImage)}">
  <meta property="og:site_name" content="${esc(SITE_NAME)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(absoluteImage)}">
${extra}`;
}

async function writePage(relativePath, html) {
  const target = path.join(ROOT, relativePath, 'index.html');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, applyShell(html));
}

/* --------------------------------------------------------- category pages */

function categoryCards(items) {
  if (!items.length) {
    return '<p class="muted">Nothing published in this category yet. New work lands here first.</p>';
  }
  return items
    .slice(0, 24)
    .map((item, index) => {
      const image = item.image || '/assets/img/hero_red-1280.webp';
      const video = item.type === 'video';
      return `<article class="card">
        <div class="card__media">
          <img src="${esc(image)}" alt="${esc(item.title)}" width="480" height="270"
            loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async">
          ${item.subcategory ? `<span class="card__badge">${esc(item.subcategory)}</span>` : ''}
        </div>
        <div class="card__body">
          <p class="card__kicker">${esc(item.category)}</p>
          <h3 class="card__title">${esc(item.title)}</h3>
          ${item.description ? `<p class="card__excerpt">${esc(item.description)}</p>` : ''}
        </div>
        <a class="card__link" href="${esc(item.path || contentPath(item))}">
          <span class="visually-hidden">${video ? 'Watch' : 'Read'} ${esc(item.title)}</span>
        </a>
      </article>`;
    })
    .join('\n');
}

async function buildCategoryPages(items) {
  let count = 0;
  for (const category of CATEGORIES) {
    const targets = [{ sub: '', label: category.name }].concat(
      category.subcategories.map((sub) => ({ sub, label: `${category.name} · ${sub}` }))
    );

    for (const { sub, label } of targets) {
      const matching = items.filter(
        (item) => item.category === category.name && (!sub || item.subcategory === sub)
      );
      const canonical = `${SITE_ORIGIN}${categoryPath(category.name, sub)}`;
      const description = sub
        ? `${category.blurb} Browse the ${sub} set from the official Musfiq R. Farhan archive.`
        : `${category.blurb} Browse every ${category.name} entry in the official Musfiq R. Farhan archive.`;

      const chips = category.subcategories
        .map(
          (name) =>
            `<a class="chip${name === sub ? ' is-active' : ''}" href="${categoryPath(category.name, name)}"${
              name === sub ? ' aria-current="page"' : ''
            }>${esc(name)}</a>`
        )
        .join('\n        ');

      const main = `    <div class="page-head">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span aria-hidden="true">/</span>
        <a href="${categoryPath(category.name)}">${esc(category.name)}</a>
        ${sub ? `<span aria-hidden="true">/</span><span>${esc(sub)}</span>` : ''}
      </nav>
      <h1>${esc(sub || category.name)}</h1>
      <p>${esc(description)}</p>
      <div class="chip-row">
        <a class="chip${sub ? '' : ' is-active'}" href="${categoryPath(category.name)}">All</a>
        ${chips}
      </div>
    </div>

    <section class="section" aria-labelledby="category-title">
      <div class="section__head">
        <h2 class="section__title" id="category-title">${esc(label)}</h2>
        <span class="section__link" data-category-count>${matching.length} published ${
          matching.length === 1 ? 'item' : 'items'
        }</span>
      </div>
      <div class="grid" data-category-items>
${categoryCards(matching)}
      </div>
    </section>

    <div data-category-gallery></div>`;

      await writePage(
        categoryPath(category.name, sub),
        pageShell({
          head: seoHead({
            title: `${label} | ${SITE_NAME}`,
            description,
            canonical,
            image: matching[0]?.image
          }),
          bodyAttrs: ` data-category="${esc(category.name)}"${sub ? ` data-subcategory="${esc(sub)}"` : ''}`,
          main,
          scripts: '  <script type="module" src="/assets/js/category.js"></script>'
        })
      );
      count += 1;
    }
  }
  log(`generated ${count} category page(s)`);
}

/* ------------------------------------------------------------- item pages */

/** Minimal markdown → HTML for the pre-rendered article body. */
function renderBody(text) {
  const source = String(text || '').trim();
  if (!source) return '';
  return source
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = esc(block.trim());
      if (!trimmed) return '';
      const heading = trimmed.match(/^(#{2,4})\s+(.*)$/);
      if (heading) {
        const level = Math.min(heading[1].length, 4);
        return `<h${level}>${heading[2]}</h${level}>`;
      }
      if (trimmed.split('\n').every((line) => /^\s*[-*]\s+/.test(line))) {
        return `<ul>${trimmed
          .split('\n')
          .map((line) => `<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`)
          .join('')}</ul>`;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

async function buildItemPages(items) {
  let count = 0;
  for (const item of items) {
    if (!item.slug || !item.category) continue;
    const category = findCategory(item.category);
    if (!category) continue;

    const canonical = item.canonical_url || `${SITE_ORIGIN}${contentPath(item)}`;
    const description = item.meta_description || item.description || `${item.title} — ${SITE_NAME}.`;
    const isVideo = item.type === 'video';
    const poster = item.thumbnail_url || item.image || '/assets/img/hero_red-1280.webp';

    const playerBlock = isVideo
      ? `      <div data-entry-player>
        <div class="player">
          <img class="player__poster" src="${esc(poster)}" alt="" width="1280" height="720" fetchpriority="high" decoding="async">
        </div>
      </div>`
      : `      <div data-entry-player></div>
      <img src="${esc(poster)}" alt="${esc(item.title)}" width="1280" height="720"
        style="border-radius:18px;margin-bottom:1.5rem" fetchpriority="high" decoding="async">`;

    const main = `    <div class="page-head">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span aria-hidden="true">/</span>
        <a href="${categoryPath(item.category)}" data-entry-crumb>${esc(item.category)}</a>
        <span aria-hidden="true">/</span><span>${esc(item.title)}</span>
      </nav>
      <h1 data-entry-title>${esc(item.title)}</h1>
      <div class="meta-row" data-entry-meta>
        <time datetime="${esc(item.published_at || '')}">${esc(
          (item.published_at || '').slice(0, 10)
        )}</time>
        <span>By <strong>${esc(item.author_name || 'Musfiq R. Farhan')}</strong></span>
      </div>
    </div>

    <div class="article">
      <div>
${playerBlock}
        <div class="article__body" data-entry-body>
          ${item.description ? `<p class="hero__lede" data-entry-lead>${esc(item.description)}</p>` : ''}
${renderBody(item.body)}
        </div>
      </div>
      <aside class="article__aside">
        <div data-rating="${esc(item.slug)}"></div>
      </aside>
    </div>

    <div data-entry-related></div>`;

    await writePage(
      contentPath(item),
      pageShell({
        head: seoHead({
          title: item.seo_title || `${item.title} | ${SITE_NAME}`,
          description,
          canonical,
          image: item.og_image || item.image,
          type: isVideo ? 'video.other' : 'article',
          extra: [
            item.keywords ? `  <meta name="keywords" content="${esc(item.keywords)}">` : '',
            `  <meta name="author" content="${esc(item.author_name || 'Musfiq R. Farhan')}">`,
            item.published_at
              ? `  <meta property="article:published_time" content="${esc(item.published_at)}">`
              : '',
            item.modified_at
              ? `  <meta property="article:modified_time" content="${esc(item.modified_at)}">`
              : '',
            `  <meta property="article:section" content="${esc(item.category)}">`
          ]
            .filter(Boolean)
            .join('\n')
        }),
        bodyAttrs: ` data-slug="${esc(item.slug)}" data-category="${esc(item.category)}"`,
        main,
        scripts: '  <script type="module" src="/assets/js/entry.js"></script>'
      })
    );
    count += 1;
  }
  log(`generated ${count} item page(s)`);
}

/* --------------------------------------------------------------- sitemaps */

async function buildSitemaps(items, gallery) {
  const now = new Date().toISOString();
  const files = {
    'sitemap.xml': sitemapIndex(SITE_ORIGIN, now),
    'sitemap-pages.xml': pagesSitemap(SITE_ORIGIN, now),
    'sitemap-categories.xml': categoriesSitemap(SITE_ORIGIN, now),
    'sitemap-content.xml': contentSitemap(items, SITE_ORIGIN),
    'sitemap-images.xml': imagesSitemap(gallery, SITE_ORIGIN)
  };
  for (const [name, body] of Object.entries(files)) {
    await writeFile(path.join(ROOT, name), body);
  }

  await writeFile(
    path.join(ROOT, 'robots.txt'),
    `User-agent: *
Allow: /
Disallow: /admin/

User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`
  );
  log(`wrote ${Object.keys(files).length} sitemap file(s) and robots.txt`);
}

/* ------------------------------------------------------------------- main */

async function fetchExport() {
  const response = await fetch(`${API_BASE}/api/public/export`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`API responded ${response.status}`);
  return response.json();
}

async function main() {
  log(`api: ${API_BASE}`);

  let data = null;
  try {
    data = await fetchExport();
    log(`fetched ${data.items?.length || 0} item(s), ${data.gallery?.length || 0} gallery image(s)`);
  } catch (error) {
    log(`WARNING: could not reach the API (${error.message}).`);
    log('Rebuilding the shell and category pages only; existing item pages are left untouched.');
  }

  const items = data?.items || [];
  const gallery = data?.gallery || [];

  await buildCategoryPages(items);
  if (items.length) await buildItemPages(items);
  await buildSitemaps(items, gallery);
  // Runs last so freshly generated pages get the shell too.
  await injectShellEverywhere();

  if (!existsSync(path.join(ROOT, 'index.html'))) {
    throw new Error('index.html is missing after the build');
  }
  log('done');
}

main().catch((error) => {
  console.error('[build] failed:', error);
  process.exitCode = 1;
});
