/**
 * The reference profile's works table.
 *
 * A filmography kept by hand goes stale the week after it is written. This
 * builds the table from the site's own published archive, so publishing a
 * natok from the dashboard adds a row here with nothing else to remember.
 */

import { api } from './api.js';
import { SITE } from './config.js';
import { $, addJsonLd, attr, esc } from './dom.js';

/** Sections whose items belong in a filmography, in reading order. */
const WORK_CATEGORIES = new Set([
  'New Natok',
  'Natok & Telefilm',
  'Short Clips',
  'New Teaser',
  'Poster Release'
]);

/** The year to file a title under: an explicit year beats the publish date. */
function yearOf(item) {
  const stated = String(item.year || '').match(/\d{4}/);
  if (stated) return stated[0];
  const published = String(item.published_at || '').slice(0, 4);
  return /^\d{4}$/.test(published) ? published : '—';
}

function rowMarkup(item) {
  const section = item.subcategory && item.subcategory !== item.category
    ? `${item.category} · ${item.subcategory}`
    : item.category;

  return `<tr>
    <td>${esc(yearOf(item))}</td>
    <td><a href="${attr(item.path || '/')}">${esc(item.title)}</a></td>
    <td>${esc(section)}</td>
  </tr>`;
}

export async function initWiki() {
  const table = $('[data-wiki-works]');
  if (!table) return;
  const body = table.querySelector('tbody');
  const note = $('[data-wiki-works-note]');

  let items = [];
  try {
    const data = await api.export();
    items = (data.items || [])
      .filter((item) => WORK_CATEGORIES.has(item.category) || WORK_CATEGORIES.has(item.subcategory))
      .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
  } catch {
    body.innerHTML =
      '<tr><td colspan="3">The archive could not load right now. Please refresh in a moment.</td></tr>';
    return;
  }

  if (!items.length) {
    body.innerHTML = '<tr><td colspan="3">No titles have been published yet.</td></tr>';
    return;
  }

  body.innerHTML = items.map(rowMarkup).join('');
  if (note) note.hidden = false;

  // The profile describes a real person, so it says so in machine-readable
  // form too — and points at the same official accounts the fact box lists.
  addJsonLd(
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      '@id': `${SITE.origin}/wiki/#profile`,
      url: `${SITE.origin}/wiki/`,
      name: 'Musfiq R. Farhan — profile, career and works',
      isPartOf: { '@id': `${SITE.origin}/#website` },
      about: { '@id': `${SITE.origin}/#person` },
      mainEntity: {
        '@id': `${SITE.origin}/#person`,
        performerIn: items.slice(0, 40).map((item) => ({
          '@type': item.type === 'video' ? 'VideoObject' : 'CreativeWork',
          name: item.title,
          url: `${SITE.origin}${item.path}`,
          datePublished: item.published_at || undefined
        }))
      }
    },
    'wiki-schema'
  );
}

initWiki();
