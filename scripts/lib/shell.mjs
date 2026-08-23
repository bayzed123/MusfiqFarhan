/**
 * Header, navigation and footer markup.
 *
 * These regions are written into every page at build time between
 * `<!--shell:x:start-->` / `<!--shell:x:end-->` markers, so the navigation is
 * present in the HTML source: crawlable without JavaScript and with no layout
 * shift while the page hydrates. assets/js/shell.js only adds behaviour.
 */

import { CATEGORIES, NAV_GROUPS, findCategory } from '../../shared/taxonomy.js';
import { PERSON_NAME, SITE_NAME, WHATSAPP_CHANNEL, X_PROFILE, categoryPath, STATIC_PATHS } from '../../shared/urls.js';

const esc = (value) =>
  String(value ?? '').replace(/[&<>'"]/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]
  );

export const ICONS = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  chevron: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m2 4 4 4 4-4"/></svg>',
  plus: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 1v10M1 6h10"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.6 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13z"/></svg>',
  arrowLeft:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  arrowRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  youtube:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 12s0-3.7-.5-5.4a2.8 2.8 0 0 0-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.6a2.8 2.8 0 0 0-2 2C1 8.3 1 12 1 12s0 3.7.5 5.4a2.8 2.8 0 0 0 2 2C5.2 20 12 20 12 20s6.8 0 8.5-.6a2.8 2.8 0 0 0 2-2C23 15.7 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>',
  instagram:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  x:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.4L2.8 2h6.4l4.4 5.8L18.9 2zm-1.1 17.8h1.7L8.3 4H6.5z"/></svg>',
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a13 13 0 0 1-5.6-4.9c-.4-.6-.9-1.5-.9-2.4 0-.9.5-1.4.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6a9 9 0 0 0 3.8 3.1c.3.1.5.1.6 0l.8-.9c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6 0 1z"/></svg>',
  imdb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 6h20v12H2zm2.6 2.4v7.2h1.6V8.4zm3 0v7.2h1.4v-4l.7 4h1l.7-4.1v4.1h1.4V8.4h-2.1l-.5 3-.5-3zm6.4 0v7.2h2.3c1.1 0 1.7-.5 1.7-1.6v-4c0-1.1-.6-1.6-1.7-1.6zm1.6 1.2h.3c.3 0 .5.1.5.5v3.8c0 .4-.2.5-.5.5h-.3z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zm7 0h3.8v1.7h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.5c0-1.3 0-3-1.85-3s-2.1 1.4-2.1 2.9V21h-4z"/></svg>'
};

const SOCIAL_LINKS = [
  { label: 'YouTube', href: 'https://youtube.com/@musfiqrfarhan', icon: 'youtube' },
  { label: 'Facebook', href: 'https://www.facebook.com/Musfiqrfarhanofficial/', icon: 'facebook' },
  { label: 'Instagram', href: 'https://www.instagram.com/musfiqfarhan', icon: 'instagram' },
  { label: 'X', href: X_PROFILE, icon: 'x' },
  { label: 'WhatsApp channel', href: WHATSAPP_CHANNEL, icon: 'whatsapp' },
  { label: 'IMDb', href: 'https://www.imdb.com/name/nm11068428/bio/', icon: 'imdb' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/musfiqrfarhanofficial', icon: 'linkedin' }
];

/** The love-note ticker. JS swaps in live notes; this seed keeps the bar stable. */
export function loveStripHtml() {
  return `<div class="love-strip" data-love-strip>
  <div class="love-strip__inner">
    <p class="love-strip__label"><span>Fan love notes</span><span class="love-strip__count" data-love-count>0</span></p>
    <div class="love-strip__viewport">
      <div class="love-strip__track" data-love-track>
        <span class="love-chip"><span class="love-chip__message">Loading messages from the fan adda…</span></span>
      </div>
    </div>
    <a class="love-strip__cta" href="${STATIC_PATHS.loveNotes}">Write yours</a>
  </div>
</div>`;
}

function megaMenu(group) {
  const columns = group.categories
    .map((name) => {
      const category = findCategory(name);
      if (!category) return '';
      const subs = category.subcategories
        .map(
          (sub) =>
            `<a class="mega__sub" href="${categoryPath(category.name, sub)}">${esc(sub)}</a>`
        )
        .join('');
      return `<div class="mega__group">
          <a class="mega__title" href="${categoryPath(category.name)}">${esc(category.name)}</a>
          ${subs}
        </div>`;
    })
    .join('');
  return columns;
}

export function headerHtml() {
  /*
   * Four plain destinations carry almost all the traffic, so they are links
   * rather than menus. The sixteen categories live behind a single
   * "Categories" dropdown — previously they were four separate menus, one of
   * which was also called "Watch", which read as two different things with
   * the same name.
   */
  const categoryColumns = NAV_GROUPS.map(
    (group) => `<div class="mega__col">
        <p class="mega__label">${esc(group.label)}</p>
        ${megaMenu(group)}
      </div>`
  ).join('');

  return `<header class="site-header" data-header>
  <div class="site-header__bar">
    <a class="brand" href="/" aria-label="${esc(SITE_NAME)} home">
      <img class="brand__mark" src="/assets/mrf-mark.svg" alt="" width="38" height="38">
      <span class="brand__words">
        <span class="brand__name">${esc(PERSON_NAME).toUpperCase()}</span>
        <span class="brand__tag">OFFICIAL</span>
      </span>
    </a>
    <nav class="primary-nav" aria-label="Main">
      <a class="nav-link" href="${STATIC_PATHS.watch}">Watch</a>
      <a class="nav-link" href="${STATIC_PATHS.blog}">Blog</a>
      <a class="nav-link" href="${STATIC_PATHS.gallery}">Gallery</a>
      <a class="nav-link" href="${STATIC_PATHS.loveNotes}">Love notes</a>
      <div class="nav-item" data-nav-item>
        <button class="nav-link" type="button" aria-expanded="false" aria-controls="mega-categories">
          Categories${ICONS.chevron}
        </button>
        <div id="mega-categories">
          <div class="mega mega--wide" role="group" aria-label="All categories">${categoryColumns}</div>
        </div>
      </div>
    </nav>
    <div class="header-actions">
      <button class="icon-button" type="button" data-search-open aria-label="Search the archive">${ICONS.search}</button>
      <a class="button button--whatsapp" href="${WHATSAPP_CHANNEL}" target="_blank" rel="noopener">Join the adda</a>
      <button class="icon-button nav-toggle" type="button" data-drawer-open aria-label="Open menu" aria-expanded="false">${ICONS.menu}</button>
    </div>
  </div>
</header>

<div class="drawer" data-drawer hidden>
  <div class="drawer__scrim" data-drawer-close></div>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Site menu">
    <div class="drawer__head">
      <span class="drawer__title">Browse</span>
      <button class="icon-button" type="button" data-drawer-close aria-label="Close menu">${ICONS.close}</button>
    </div>
    <div class="drawer__body">
      <a class="button button--primary button--block" href="${STATIC_PATHS.loveNotes}" style="margin-bottom:1rem">Leave a love note</a>
      <div class="drawer__hubs">
        <a href="${STATIC_PATHS.watch}">Watch</a>
        <a href="${STATIC_PATHS.blog}">Blog</a>
        <a href="${STATIC_PATHS.gallery}">Gallery</a>
        <a href="${STATIC_PATHS.loveNotes}">Love notes</a>
      </div>
      ${CATEGORIES.map(
        (category, index) => `<div class="accordion">
          <button class="accordion__trigger" type="button" aria-expanded="false" aria-controls="drawer-panel-${index}">
            ${esc(category.name)}${ICONS.plus}
          </button>
          <div class="accordion__panel" id="drawer-panel-${index}" hidden>
            <a href="${categoryPath(category.name)}"><strong>All ${esc(category.name)}</strong></a>
            ${category.subcategories
              .map((sub) => `<a href="${categoryPath(category.name, sub)}">${esc(sub)}</a>`)
              .join('')}
          </div>
        </div>`
      ).join('')}
      <div class="accordion">
        <a class="accordion__trigger" href="${STATIC_PATHS.gallery}">Gallery</a>
      </div>
      <div class="accordion">
        <a class="accordion__trigger" href="${STATIC_PATHS.about}">About</a>
      </div>
      <div class="accordion">
        <a class="accordion__trigger" href="${STATIC_PATHS.contact}">Contact</a>
      </div>
    </div>
  </div>
</div>

<div class="search-panel" data-search-panel hidden>
  <div class="search-panel__box" role="dialog" aria-modal="true" aria-label="Search">
    <input type="search" data-search-input placeholder="Search natok, posters, blog posts…" aria-label="Search the archive">
    <div class="search-results" data-search-results></div>
  </div>
</div>`;
}

/** WhatsApp / fan-adda call to action reused above the footer. */
export function ctaHtml() {
  return `<section class="cta-band" aria-labelledby="cta-title">
  <div>
    <h2 id="cta-title">Our unlimited fan adda, every single day</h2>
    <p>Get every poster, teaser and natok the moment it drops. Join the official WhatsApp channel, then leave a love note so ${esc(
      PERSON_NAME
    )} can read it.</p>
  </div>
  <div class="cta-band__actions">
    <a class="button button--whatsapp" href="${WHATSAPP_CHANNEL}" target="_blank" rel="noopener">Follow on WhatsApp</a>
    <a class="button button--ghost" href="${STATIC_PATHS.loveNotes}">Write a love note</a>
  </div>
</section>`;
}

export function footerHtml() {
  const columns = NAV_GROUPS.map(
    (group) => `<div>
      <h2>${esc(group.label)}</h2>
      <ul>${group.categories
        .map((name) => `<li><a href="${categoryPath(name)}">${esc(name)}</a></li>`)
        .join('')}</ul>
    </div>`
  ).join('');

  // The CTA band is its own region so a page can place it inside <main>.
  return `<footer class="site-footer">
  <div class="footer-brand">
    <img src="/assets/mrf-mark.svg" alt="" width="64" height="64">
    <div>
      <p class="footer-brand__name">${esc(PERSON_NAME).toUpperCase()}</p>
      <p class="footer-brand__tag">OFFICIAL</p>
      <p class="footer-brand__line">Actor &middot; Radio jockey &middot; Storyteller &mdash; Dhaka, Bangladesh</p>
    </div>
  </div>
  <div class="footer-grid">
    ${columns}
    <div>
      <h2>Official</h2>
      <ul>
        <li><a href="${STATIC_PATHS.about}">About</a></li>
        <li><a href="${STATIC_PATHS.wiki}">Wiki profile</a></li>
        <li><a href="${STATIC_PATHS.watch}">Watch</a></li>
        <li><a href="${STATIC_PATHS.blog}">Blog</a></li>
        <li><a href="${STATIC_PATHS.gallery}">Gallery</a></li>
        <li><a href="${STATIC_PATHS.loveNotes}">Love notes</a></li>
        <li><a href="${STATIC_PATHS.contact}">Contact &amp; press</a></li>
        <li><a href="${STATIC_PATHS.editorial}">Editorial standards</a></li>
        <li><a href="${STATIC_PATHS.privacy}">Privacy policy</a></li>
        <li><a href="${STATIC_PATHS.terms}">Terms of service</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; <span data-year>${new Date().getFullYear()}</span> ${esc(SITE_NAME)}. All rights reserved.</p>
    <div class="social-row">
      ${SOCIAL_LINKS.map(
        (item) =>
          `<a href="${item.href}" target="_blank" rel="noopener" aria-label="${esc(item.label)}">${ICONS[item.icon]}</a>`
      ).join('')}
    </div>
  </div>
</footer>`;
}

/** Head fragment shared by every page: fonts, styles and theme colour. */
export function headAssetsHtml() {
  return `<meta name="theme-color" content="#08090c">
  <link rel="icon" type="image/svg+xml" href="/assets/mrf-mark.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;800&family=Noto+Sans+Bengali:wght@400;600&family=Playfair+Display:ital,wght@0,600;1,600&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;800&family=Noto+Sans+Bengali:wght@400;600&family=Playfair+Display:ital,wght@0,600;1,600&display=swap">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script defer src="/assets/js/ads.js"></script>`;
}

/**
 * Site-wide structured data. Every page carries the same Person /
 * Organization / WebSite graph under stable @id values, so per-page schema
 * (Article, VideoObject, BreadcrumbList) can reference it instead of
 * repeating the identity block.
 */
export function siteSchemaHtml(origin = 'https://www.musfiqrfarhan.blog') {
  const graph = [
    {
      '@type': 'Person',
      '@id': `${origin}/#person`,
      name: PERSON_NAME,
      alternateName: ['Musfiq R Farhan', 'Musfiq Farhan', 'RJ Farhan', 'মুশফিক আর ফারহান'],
      jobTitle: ['Actor', 'Radio Jockey', 'Content Creator'],
      nationality: { '@type': 'Country', name: 'Bangladesh' },
      description:
        'Musfiq R. Farhan is a Bangladeshi actor, radio jockey and content creator known for natok, telefilm and digital storytelling.',
      url: `${origin}/`,
      image: [`${origin}/assets/img/og-card.jpg`, `${origin}/assets/profile_1.jpg`],
      knowsLanguage: ['bn', 'en'],
      knowsAbout: ['Acting', 'Bangla natok', 'Telefilm', 'Radio broadcasting', 'Storytelling'],
      hasOccupation: [
        { '@type': 'Occupation', name: 'Actor' },
        { '@type': 'Occupation', name: 'Radio jockey' },
        { '@type': 'Occupation', name: 'Content creator' }
      ],
      mainEntityOfPage: { '@id': `${origin}/#website` },
      publishingPrinciples: `${origin}${STATIC_PATHS.editorial}`,
      sameAs: SOCIAL_LINKS.map((item) => item.href).concat([
        'https://www.crunchbase.com/person/musfiq-r-farhan'
      ])
    },
    {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: SITE_NAME,
      url: `${origin}/`,
      logo: { '@type': 'ImageObject', url: `${origin}/assets/mrf-mark.svg` },
      email: 'farhanvengers.contact@gmail.com',
      founder: { '@id': `${origin}/#person` },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'press and collaborations',
        email: 'farhanvengers.contact@gmail.com',
        availableLanguage: ['Bengali', 'English']
      },
      sameAs: SOCIAL_LINKS.map((item) => item.href)
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: `${origin}/`,
      name: SITE_NAME,
      inLanguage: 'en',
      publisher: { '@id': `${origin}/#organization` },
      about: { '@id': `${origin}/#person` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${origin}/search/?q={search_term_string}` },
        'query-input': 'required name=search_term_string'
      }
    }
  ];

  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph
  })}</script>`;
}

export const SHELL_REGIONS = {
  head: headAssetsHtml,
  schema: siteSchemaHtml,
  lovestrip: loveStripHtml,
  header: headerHtml,
  cta: ctaHtml,
  footer: footerHtml
};
