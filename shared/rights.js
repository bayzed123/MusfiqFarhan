/**
 * Who owns a piece of media, worked out from where the media came from.
 *
 * Two things get published here and they are not the same thing:
 *
 *   A file uploaded from the phone lands in this site's own storage and is
 *   served from this domain. It is Musfiq R. Farhan's own work, and the page
 *   should say so — that is what makes a search engine treat this site as the
 *   source rather than one more copy of something.
 *
 *   A link pasted from YouTube or Facebook is someone else's upload, embedded
 *   here because he acts in it. The rights are the uploader's. Claiming a
 *   licence over it would be false, and Google's own guidance is to attribute
 *   rather than claim. So the page names the platform, links back to the
 *   original, and states his part in it — he is the performer, not the owner.
 *
 * The dashboard does not ask which of the two it is: the URL already knows.
 * `rights_mode` defaults to `auto` and only exists so an editor can overrule
 * the guess in the rare case it is wrong.
 */

import { PERSON_NAME, SITE_ORIGIN, isOwnMedia, mediaSource } from './urls.js';

/** What an editor may choose. `auto` reads the media and decides. */
export const RIGHTS_MODES = ['auto', 'own', 'shared'];

/** Where the site states what it owns, and where to ask for a copy. */
export const LICENSE_PATH = '/terms-of-service.html#copyright';
export const ACQUIRE_LICENSE_PATH = '/contact.html';

export function normaliseRightsMode(value) {
  const mode = String(value ?? 'auto').trim().toLowerCase();
  return RIGHTS_MODES.includes(mode) ? mode : 'auto';
}

/**
 * The media that decides the question: the thing the page is actually built
 * around. For a video that is the player source; for anything else, the cover.
 */
function primaryMedia(item) {
  if (item?.type === 'video') {
    return (
      String(item.video_url || '').trim() ||
      String(item.embed_url || '').trim() ||
      String(item.attachment_url || '').trim()
    );
  }
  return (
    String(item?.image_url || '').trim() ||
    String(item?.image || '').trim() ||
    String(item?.og_image || '').trim()
  );
}

/**
 * Everything the page needs to say about provenance.
 *
 * `mode` is 'own' or 'shared' — never 'auto', which is a stored preference
 * rather than an answer.
 */
export function rightsFor(item, origin = SITE_ORIGIN) {
  const stored = normaliseRightsMode(item?.rights_mode);
  const media = primaryMedia(item);
  const source = mediaSource(media);

  const detected = source && !isOwnMedia(media, origin) ? 'shared' : 'own';
  const mode = stored === 'auto' ? detected : stored;

  if (mode === 'own') {
    return { mode, source: null, sourceUrl: '', creditLine: '' };
  }

  const platform = source?.name || 'the original platform';
  return {
    mode,
    source,
    sourceUrl: source ? media : '',
    creditLine: source
      ? `Shared from ${platform}. ${PERSON_NAME} appears in this video; the rights stay with the original uploader.`
      : `${PERSON_NAME} appears in this video; the rights stay with the original uploader.`
  };
}

/** The year to claim copyright for: when it was published here. */
function copyrightYear(item) {
  const year = String(item?.published_at || item?.created_at || '').slice(0, 4);
  return /^\d{4}$/.test(year) ? Number(year) : undefined;
}

/**
 * The provenance properties for one item, ready to spread into a CreativeWork.
 *
 * Own work gets the full ownership claim. Shared work gets attribution and no
 * claim at all: no `license`, no `copyrightHolder`, no `acquireLicensePage`.
 * `performer` adds the credit that only makes sense on a video — schema.org
 * puts `actor` on VideoObject, not on Article.
 */
export function rightsBlock(item, origin = SITE_ORIGIN, { performer = false } = {}) {
  const rights = rightsFor(item, origin);

  if (rights.mode === 'own') {
    return {
      creator: { '@id': `${origin}/#person` },
      copyrightHolder: { '@id': `${origin}/#person` },
      copyrightYear: copyrightYear(item),
      creditText: `${PERSON_NAME} Official`,
      license: `${origin}${LICENSE_PATH}`,
      acquireLicensePage: `${origin}${ACQUIRE_LICENSE_PATH}`
    };
  }

  return {
    ...(performer ? { actor: { '@id': `${origin}/#person` } } : {}),
    ...(rights.source
      ? {
          sourceOrganization: {
            '@type': 'Organization',
            name: rights.source.name,
            url: rights.source.url
          }
        }
      : {}),
    ...(rights.sourceUrl ? { isBasedOn: rights.sourceUrl } : {}),
    creditText: rights.creditLine
  };
}

/** True when this item claims the site's own licence. */
export function isOwnWork(item, origin = SITE_ORIGIN) {
  return rightsFor(item, origin).mode === 'own';
}
