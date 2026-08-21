# Musfiq R. Farhan Homepage Redesign TODO

This checklist follows the attached homepage brief in order. **Only one task is active at a time. A task is marked complete only after its implementation and verification pass.**

| # | Task | Status | Verification gate |
|---:|---|---|---|
| 1 | Audit current homepage, routes, assets, data bindings, and deployment constraints | **Complete** | Existing public routes, Worker payloads, assets, scripts, and workflow mapped. |
| 2 | Build root homepage shell: top bar, responsive header, navigation, logo, mobile menu, and search entry point | **Complete** | Static checks passed and the local Playwright homepage smoke test passed. |
| 3 | Implement cinematic featured-story hero and Musfiq R. Farhan identity introduction | **Active next** | Hero H1, featured image/content hooks, biography link, and accessibility checks pass. |
| 4 | Implement latest news with four editorial cards and View All News flow | Pending | Four-card layout renders from managed/fallback data and links resolve. |
| 5 | Implement signature Behind the Scenes feature layout | Pending | Featured BTS and supporting BTS links render without breaking existing category navigation. |
| 6 | Implement latest videos with Netflix-style cards and watch links | Pending | Video cards, posters, player links, metadata, and existing video schema remain valid. |
| 7 | Implement latest gallery masonry treatment and managed gallery links | Pending | Gallery assets have valid sources, alt text, responsive layout, and category context. |
| 8 | Implement New Natok poster section with status, release date, and detail links | Pending | Poster cards render from managed content where available and use stable links. |
| 9 | Implement featured stories, career highlights, social follow section, and complete footer | Pending | Editorial links, timeline, social links, sitemap, legal links, and copyright render. |
| 10 | Apply the editorial visual system, responsive mobile UX, accessibility, and SEO hierarchy | Pending | Contrast, focus, reduced motion, H1/H2 structure, metadata, schema, and mobile checks pass. |
| 11 | Run final one-by-one validation, update Playwright coverage, deploy, and report results | Pending | Local checks, CI workflow, live smoke tests, and deployment report complete. |

## Audit findings for task 1

The repository is a static GitHub Pages frontend with `index.html` as the root entry point, shared public templates (`post.html`, `watch.html`, `category.html`, and trust pages), `styles.css`, `app.js`, and `category-nav.js`. The current homepage already has a strong dark cinematic system, a responsive header/menu, archive search, featured spotlight, watch, journal, gallery, taxonomy directory, trust, about, reviews, contact, and legal footer. Existing public IDs such as `#spotlight`, `#watch`, `#journal`, `#gallery`, `#about`, `#trust`, and `#contact` are used by navigation, tests, and scripts and should be preserved or aliased during the redesign.

The Worker exposes stable public payloads at `/api/public/home`, `/api/public/gallery`, `/api/public/category`, `/api/public/content/:slug`, and `/api/public/reviews`. The home payload provides one featured item, up to eight videos, and up to six posts. Content rows include type, title, slug, image, video URL, category, subcategory, year, description, SEO fields, canonical URL, author, publishing dates, duration, and thumbnail data. Gallery rows include title, slug, image URL, alt text, category, caption, and sort order. No backend schema or API change is required for the first homepage pass.

The current asset set includes the hero, portrait, profile, poster, logo, and touch icon images. The brief’s visual direction will be implemented as **premium editorial cinema**: near-black hero and navigation, warm off-white editorial surfaces, one electric lime accent, restrained red/amber image treatment, bold modern sans-serif headings, readable body copy, small uppercase metadata, glossy image overlays, and subtle motion gated by `prefers-reduced-motion`.

The existing deployment workflow runs D1 migrations, deploys `mrf-api`, generates the sitemap, publishes GitHub Pages, and runs Playwright against the live domain. The redesign will not touch Arif Gadgets resources or alter the existing admin, Worker, D1, R2, permanent-slug, review, or SEO contracts.

## Task 2 completion note

Task 2 added the fixed latest-updates top bar, changed the primary public navigation to Home, News, Behind the scenes, Videos, Gallery, Natok, Blog, and Search, added Biography and Contact to the mobile menu, and preserved the existing archive search form and anchor IDs. The top bar and header offsets are responsive at desktop, tablet, and mobile widths. The task was verified with `node --check`, `git diff --check`, structural assertions, and one local Playwright homepage test.

## Implementation rule

After each task, update this file, run that task’s verification gate, and only then move to the next numbered task. Do not batch the whole redesign into one unverified change.
