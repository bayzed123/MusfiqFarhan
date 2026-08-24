/**
 * Who owns a piece of media, in the form a search engine reads.
 *
 * Almost everything here is Musfiq R. Farhan's own work, and saying so in the
 * markup is what makes Google treat this site as the source rather than one
 * more copy. But not quite everything is: a press photograph or a poster from
 * a production company is published with permission, not owned, and claiming
 * a licence over it would be a false statement made at scale.
 *
 * So it is a decision the editor makes, not one the code guesses — the
 * "Original work" switch in the dashboard, stored per item. This module turns
 * that one flag into the block of properties, so the video schema, the article
 * schema and the gallery images all make the same claim in the same words.
 */

import { PERSON_NAME, SITE_ORIGIN } from './urls.js';

/** The section of the terms that states ownership and how to ask for a copy. */
export const LICENSE_PATH = '/terms-of-service.html#copyright';
export const ACQUIRE_LICENSE_PATH = '/contact.html';

/**
 * Unset means licensed. The column defaults to 1 and predates nothing — every
 * row that existed when it was added was already published under the site's
 * own terms — so only an explicit 0 turns the claim off.
 */
export function isLicensed(item) {
  return Number(item?.licensed ?? 1) !== 0;
}

/** The year to claim copyright for: when it was published here. */
function copyrightYear(item) {
  const year = String(item?.published_at || item?.created_at || '').slice(0, 4);
  return /^\d{4}$/.test(year) ? Number(year) : undefined;
}

/**
 * The rights properties for one item, or an empty object when the editor has
 * said this is not ours to license. Spread into a CreativeWork of any kind.
 */
export function rightsBlock(item, origin = SITE_ORIGIN) {
  if (!isLicensed(item)) return {};
  return {
    creator: { '@id': `${origin}/#person` },
    copyrightHolder: { '@id': `${origin}/#person` },
    copyrightYear: copyrightYear(item),
    creditText: `${PERSON_NAME} Official`,
    license: `${origin}${LICENSE_PATH}`,
    acquireLicensePage: `${origin}${ACQUIRE_LICENSE_PATH}`
  };
}
