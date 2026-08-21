# Musfiq R. Farhan Homepage Redesign TODO

This checklist follows the attached homepage brief in order. **Only one task is active at a time. A task is marked complete only after its implementation and verification pass.**

| # | Task | Status | Verification gate |
|---:|---|---|---|
| 1 | Audit current homepage, routes, assets, data bindings, and deployment constraints | **Complete** | Existing public routes, Worker payloads, assets, scripts, and workflow mapped. |
| 2 | Build root homepage shell: top bar, responsive header, navigation, logo, mobile menu, and search entry point | **Complete** | Static checks passed and the local Playwright homepage smoke test passed. |
| 3 | Implement cinematic featured-story hero and Musfiq R. Farhan identity introduction | **Complete** | Static checks and the focused local Playwright homepage test passed. |
| 4 | Implement latest news with four editorial cards and View All News flow | **Complete** | Four-card layout, images, link, syntax, and focused local Playwright test passed. |
| 5 | Implement signature Behind the Scenes feature layout | **Complete** | Featured BTS, two supporting cards, managed gallery binding, syntax, and focused local Playwright test passed. |
| 6 | Implement latest videos with Netflix-style cards and watch links | **Complete** | Four video cards, poster alt text, watch links, filters, syntax, and focused local Playwright test passed. |
| 7 | Implement latest gallery masonry treatment and managed gallery links | **Complete** | Four linked gallery frames, alt text, masonry class, filters, syntax, and focused local Playwright test passed. |
| 8 | Implement New Natok poster section with status, release date, and detail links | **Complete** | Three poster cards, status metadata, alt text, archive links, syntax, and focused local Playwright test passed. |
| 9 | Implement featured stories, career highlights, social follow section, and complete footer | **Complete** | Featured story, three story links, five timeline milestones, social links, footer copy, syntax, and focused local Playwright test passed. |
| 10 | Apply the editorial visual system, responsive mobile UX, accessibility, and SEO hierarchy | **Complete** | Skip link, author metadata, menu ARIA, focus states, reduced-motion hooks, syntax, and focused local Playwright test passed. |
| 11 | Run final one-by-one validation, update Playwright coverage, deploy, and report results | Pending | Local checks, CI workflow, live smoke tests, and deployment report complete. |

## Audit findings for task 1

The repository is a static GitHub Pages frontend with `index.html` as the root entry point, shared public templates (`post.html`, `watch.html`, `category.html`, and trust pages), `styles.css`, `app.js`, and `category-nav.js`. The current homepage already has a strong dark cinematic system, a responsive header/menu, archive search, featured spotlight, watch, journal, gallery, taxonomy directory, trust, about, reviews, contact, and legal footer. Existing public IDs such as `#spotlight`, `#watch`, `#journal`, `#gallery`, `#about`, `#trust`, and `#contact` are used by navigation, tests, and scripts and should be preserved or aliased during the redesign.

The Worker exposes stable public payloads at `/api/public/home`, `/api/public/gallery`, `/api/public/category`, `/api/public/content/:slug`, and `/api/public/reviews`. The home payload provides one featured item, up to eight videos, and up to six posts. Content rows include type, title, slug, image, video URL, category, subcategory, year, description, SEO fields, canonical URL, author, publishing dates, duration, and thumbnail data. Gallery rows include title, slug, image URL, alt text, category, caption, and sort order. No backend schema or API change is required for the first homepage pass.

The current asset set includes the hero, portrait, profile, poster, logo, and touch icon images. The brief’s visual direction will be implemented as **premium editorial cinema**: near-black hero and navigation, warm off-white editorial surfaces, one electric lime accent, restrained red/amber image treatment, bold modern sans-serif headings, readable body copy, small uppercase metadata, glossy image overlays, and subtle motion gated by `prefers-reduced-motion`.

The existing deployment workflow runs D1 migrations, deploys `mrf-api`, generates the sitemap, publishes GitHub Pages, and runs Playwright against the live domain. The redesign will not touch Arif Gadgets resources or alter the existing admin, Worker, D1, R2, permanent-slug, review, or SEO contracts.

## Task 2 completion note

Task 2 added the fixed latest-updates top bar, changed the primary public navigation to Home, News, Behind the scenes, Videos, Gallery, Natok, Blog, and Search, added Biography and Contact to the mobile menu, and preserved the existing archive search form and anchor IDs. The top bar and header offsets are responsive at desktop, tablet, and mobile widths. The task was verified with `node --check`, `git diff --check`, structural assertions, and one local Playwright homepage test.

## Task 3 completion note

Task 3 added a featured-story information card inside the cinematic hero with badge, date, summary, and a stable story link. It also added a warm editorial identity section with a portrait, accessible alt text, Bangladeshi actor/RJ description, and a link to the managed biography article. The existing `#spotlight`, `#watch`, `#about`, and API-driven spotlight card were preserved. Managed featured data now updates the new hero card through `renderFeatured()`.

## Task 4 completion note

Task 4 converted the former journal block into a Latest News section with four managed/fallback cards, image-led editorial surfaces, dates, summaries, Read the story links, category filters, and a View all news destination. The existing `#journal` ID and post API contract remain intact, so current CMS content continues to populate the section.

## Task 5 completion note

Task 5 added the signature Behind the Scenes section after Latest News: one large featured frame, two supporting BTS moments, explanatory copy, and an Explore BTS link to the crawlable category archive. Published gallery records containing BTS, studio, making-of, or related terms now populate the section automatically; the curated static frames remain the safe fallback.

## Task 6 completion note

Task 6 reframed the video area as Latest Videos while retaining the existing `#watch` anchor, filters, modal player, YouTube channel link, dynamic video schema, and fallback posters. Each card now also exposes a direct stable `watch.html?slug=...` link, so the section works as both a glossy Netflix-style interaction deck and a crawlable content index.

## Task 7 completion note

Task 7 upgraded the gallery block to Latest Gallery with linked responsive masonry frames, captions, View gallery affordances, filter compatibility, and a View all gallery route. Managed gallery records now link to their category archive and preserve admin-controlled image URL, alt text, caption, category, and sort order behavior.

## Task 8 completion note

Task 8 added a New Natok poster section with three responsive poster cards, status labels, release/archive metadata, View details links, and a View all natok route. Published managed posts matching natok, telefilm, poster, or release terms update the cards automatically; the curated poster set remains the fallback. Existing category routes and permanent content slugs are preserved.

## Task 9 completion note

Task 9 added a Featured Stories feature article with three supporting story links, a five-point career-highlights timeline, a Follow the latest updates social panel, and explanatory footer brand copy. Existing reviews, trust content, legal links, social profiles, sitemap, dynamic copyright year, and contact flow remain in place.

## Task 10 completion note

Task 10 added a keyboard skip link, explicit author metadata, menu-to-navigation ARIA relationships, synchronized mobile-menu labels and hidden state, visible focus treatments, reduced-motion-safe transitions, and responsive spacing for the new sections. The existing H1, schema, canonical metadata, category navigation, legal links, and dynamic content behavior remain intact.

## Implementation rule

After each task, update this file, run that task’s verification gate, and only then move to the next numbered task. Do not batch the whole redesign into one unverified change.
