/**
 * Category listing controller.
 *
 * The category and subcategory come from the page itself
 * (`<body data-category="…" data-subcategory="…">`), which the static build
 * writes when it generates /c/<category>/ and /c/<category>/<sub>/.
 */

import { api } from './api.js';
import { $, addJsonLd, attr, esc, render } from './dom.js';
import { gridMarkup, initRails } from './cards.js';
import { SITE } from './config.js';

function galleryMarkup(items) {
  if (!items?.length) return '';
  return `<section class="section" aria-labelledby="category-gallery-title">
    <div class="section__head">
      <h2 class="section__title" id="category-gallery-title">Stills from this category</h2>
    </div>
    <div class="grid grid--gallery">
      ${items
        .map(
          (item) => `<figure class="figure">
            <img src="${attr(item.image_url)}" alt="${attr(item.alt_text || item.title)}"
              width="460" height="613" loading="lazy" decoding="async">
            <figcaption>${esc(item.caption || item.title)}</figcaption>
          </figure>`
        )
        .join('')}
    </div>
  </section>`;
}

export async function initCategory() {
  const { category, subcategory = '' } = document.body.dataset;
  if (!category) return;

  const countNode = $('[data-category-count]');
  const contentNode = $('[data-category-items]');
  const galleryNode = $('[data-category-gallery]');

  try {
    const data = await api.category(category, subcategory);
    const label = subcategory ? `${data.category} · ${data.subcategory}` : data.category;

    if (countNode) {
      countNode.textContent = data.items.length
        ? `${data.items.length} published ${data.items.length === 1 ? 'item' : 'items'}`
        : 'Nothing published here yet';
    }

    if (contentNode) {
      contentNode.innerHTML = data.items.length
        ? gridMarkup(data.items, { eager: true })
        : '<p class="muted">Nothing published in this category yet. New work lands here first.</p>';
    }

    if (galleryNode) galleryNode.innerHTML = galleryMarkup(data.gallery);

    addJsonLd(
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: label,
        description: data.blurb,
        url: `${SITE.origin}${window.location.pathname}`,
        isPartOf: { '@id': `${SITE.origin}/#website` },
        about: { '@id': `${SITE.origin}/#person` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: data.items.length,
          itemListElement: data.items.slice(0, 30).map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE.origin}${item.path}`,
            name: item.title
          }))
        }
      },
      'category-schema'
    );
  } catch {
    if (contentNode && !contentNode.children.length) {
      render(contentNode, '<p class="muted">This category could not load. Please refresh in a moment.</p>');
    }
  }

  initRails();
}

initCategory();
