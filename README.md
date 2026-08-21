# Musfiq R. Farhan — Official Website

The official site of Musfiq R. Farhan: natok, teasers, posters, gallery, blog
and the fan love-note wall, published from a private studio dashboard.

- **Live site:** https://www.musfiqrfarhan.blog
- **Dashboard:** https://www.musfiqrfarhan.blog/admin/ (noindex, password protected)
- **API:** Cloudflare Worker `mrf-api` with D1 (content) and R2 (media)

---

## How it fits together

```
GitHub Pages (static)          Cloudflare Worker (mrf-api)
┌───────────────────────┐      ┌──────────────────────────┐
│ pre-rendered pages    │─────▶│ /api/public/*   read     │
│ /assets/js/*  (ESM)   │      │ /api/admin/*    write    │
│ /admin/  dashboard    │─────▶│ /media/*        R2 files │
└───────────────────────┘      └───────────┬──────────────┘
            ▲                              │
            │  scripts/build-site.mjs      ▼
            └──────────────────────  D1 (content, gallery,
               reads /api/public/export     reviews, love_notes)
```

Pages are **pre-rendered at build time** so search engines and first-time
visitors get real HTML, then the same page **refreshes itself from the API**,
so anything published in the dashboard appears immediately without waiting
for a rebuild.

## Repository layout

| Path | What it holds |
| --- | --- |
| `shared/taxonomy.js` | The 16 categories, their subcategories, and the admin content kinds. **The single source of truth** — the Worker, the site and the dashboard all read it. |
| `shared/urls.js` | URL rules, slug generation, media/embed detection. |
| `shared/sitemap.js` | Sitemap XML generation, used by both the Worker and the build. |
| `worker/src/` | The API: `index.js` routes, `lib/` for auth, content, media, notes, reviews. |
| `worker/migrations/` | D1 schema migrations, applied automatically on deploy. |
| `assets/css/` | `site.css` (public) and `admin.css` (dashboard). |
| `assets/js/` | Public site modules. `assets/js/admin/` is the dashboard. |
| `scripts/build-site.mjs` | Generates pages, category listings, sitemaps and the shared shell. |
| `scripts/lib/shell.mjs` | Header, navigation, CTA, footer and site-wide schema markup. |
| `tests/site.spec.js` | Playwright suite, run before and after every deploy. |
| `content-archive/` | Legacy markdown from the pre-2026 site, kept for reference only. |

## URLs

Every item gets one permanent, human-readable URL, fixed on first publish and
never regenerated when a title is edited:

| Kind | Pattern | Example |
| --- | --- | --- |
| Item | `/<category>/<slug>/` | `/new-natok/tor-preme-pagol/` |
| Category | `/c/<category>/` | `/c/new-natok/` |
| Subcategory | `/c/<category>/<subcategory>/` | `/c/new-natok/eid-special/` |
| Gallery | `/gallery/` | |
| Love notes | `/love-notes/` | |

## Publishing

1. Sign in at `/admin/`.
2. **Publish something** → pick what it is (poster, short video, behind the
   scenes, natok teaser, full natok, image gallery, lifestyle, friends adda,
   blog post, funny clip, press, wallpaper, biography, hero banner). The kind
   sets the storage type, category and subcategory, so an item can never land
   outside the navigation.
3. Drop the file in. Images fill the cover field, videos fill the video field.
   Anything over 80 MB uploads in 10 MB parts with progress and retries, so a
   full-length natok completes.
4. The slug, SEO title and meta description write themselves from the title
   until you type over them. The panel on the right scores the entry and shows
   the Google preview.
5. **Save and publish**, or save as a draft.

Ratings and love notes are moderated: they only go live after approval under
**Love notes** and **Ratings**.

## Local development

```bash
npm install                # Playwright only; the site itself has no bundler
npm run build              # generate pages, sitemaps and the shell
npm run serve              # http://127.0.0.1:4173
npm test                   # Playwright against the built output
npm run test:live          # the same suite against production
```

`npm run build` reads `MRF_API_URL` (default: the production Worker). If the
API cannot be reached it rebuilds the shell, the category pages and the
sitemaps, and leaves the existing item pages alone rather than shipping an
empty site.

### Worker

```bash
npm run migrate            # apply D1 migrations
npm run deploy:worker      # deploy mrf-api
```

Secrets `ADMIN_USER_NAME` and `ADMIN_PASSWORD` are set by CI from repository
secrets. Optional Worker var `MEDIA_PUBLIC_BASE` serves R2 files from a custom
domain instead of the Worker origin.

## Deployment

`.github/workflows/deploy.yml` runs on push to `main`, on demand, and every
six hours:

1. Apply D1 migrations and deploy the Worker (skipped on the scheduled run).
2. Build the static site and **run the Playwright suite against the build** —
   a failing build is never published.
3. Publish to GitHub Pages.
4. Re-run the suite against the live site.

The scheduled run exists so items published in the dashboard get their
pre-rendered page and sitemap entry without a code change.

## SEO notes

- Every page ships its own title, meta description, canonical URL, Open Graph
  and Twitter tags in the HTML source.
- Site-wide `Person` / `Organization` / `WebSite` schema is on every page under
  stable `@id`s; item pages add `Article` or `VideoObject` plus
  `BreadcrumbList`; `AggregateRating` is only emitted once real ratings exist.
- `sitemap.xml` is an index over pages, categories, content (with image and
  video extensions) and gallery images. Submit the index in Search Console.
- Navigation is in the HTML source, not injected by script, so all 16
  categories and their subcategories are crawlable without JavaScript.
- Images carry `width`/`height`, the hero is preloaded as responsive WebP, and
  video players are click-to-play so no third-party iframe loads on first
  paint.
