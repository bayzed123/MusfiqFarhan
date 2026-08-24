/**
 * Everything a search engine needs to know about a video, derived once.
 *
 * A video is described in three places — the pre-rendered item page, the same
 * page re-rendered in the browser, and the sitemap — and Google compares them.
 * Each used to work the fields out for itself, which is how the profile page
 * ended up publishing videos with no thumbnail and no upload date. Derive the
 * facts here; the three callers only format them.
 *
 * The rules Google enforces, and what this module does about them:
 *
 * - `thumbnailUrl` and `uploadDate` are required. Neither may be blank, so
 *   both fall back rather than disappear: a YouTube video always has a
 *   thumbnail derivable from its id, and every item has a publish date.
 * - `contentUrl` must be a media file the crawler can fetch. A YouTube watch
 *   page is not one; that is an `embedUrl`. Sending the wrong kind of URL is
 *   worse than sending none.
 * - `duration` must be ISO 8601. Editors type "42:10", which is not.
 */

import { rightsBlock } from './rights.js';
import {
  PERSON_NAME,
  SITE_ORIGIN,
  contentUrl,
  derivedThumbnail,
  embedUrlFor,
  isDirectVideo
} from './urls.js';

const FALLBACK_THUMBNAIL = '/assets/img/og-card.jpg';

export function isVideoItem(item) {
  return item?.type === 'video';
}

function absolute(url, origin = SITE_ORIGIN) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}/${value.replace(/^\//, '')}`;
}

/**
 * "42:10" → PT42M10S. Also accepts "1:02:03", a plain count of seconds, and
 * a value that is already ISO 8601 (returned untouched). Anything else yields
 * an empty string, because a malformed duration is an error in Search Console
 * while a missing one is merely a missing optional field.
 */
export function isoDuration(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^P(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)$/i.test(raw)) return raw.toUpperCase();

  const parts = raw.split(':').map((part) => part.trim());
  if (!parts.every((part) => /^\d+$/.test(part)) || parts.length > 3) return '';

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] =
    numbers.length === 3
      ? numbers
      : numbers.length === 2
        ? [0, numbers[0], numbers[1]]
        : [0, 0, numbers[0]];

  const time = [
    hours ? `${hours}H` : '',
    minutes ? `${minutes}M` : '',
    seconds ? `${seconds}S` : ''
  ].join('');
  return time ? `PT${time}` : '';
}

/**
 * The one description of a video, with every fallback already applied.
 * `contentUrl` and `embedUrl` are mutually exclusive by construction: a file
 * we host is content, a third-party player is an embed.
 */
export function videoFacts(item, origin = SITE_ORIGIN) {
  const canonical = item?.canonical_url || `${origin}${item?.path || ''}` || contentUrl(item, origin);

  const hosted = String(item?.attachment_url || '').trim();
  const stated = String(item?.video_url || '').trim();
  const embed = String(item?.embed_url || '').trim() || embedUrlFor(stated);
  // A hosted file is only content if it really is a file; a stated URL only
  // counts when nothing turned it into a player.
  const content = isDirectVideo(hosted) ? hosted : !embed && isDirectVideo(stated) ? stated : '';

  const thumbnail =
    absolute(item?.thumbnail_url, origin) ||
    absolute(item?.og_image, origin) ||
    absolute(item?.image, origin) ||
    derivedThumbnail(stated) ||
    `${origin}${FALLBACK_THUMBNAIL}`;

  return {
    canonical,
    name: item?.seo_title || item?.title || '',
    description: item?.meta_description || item?.description || item?.title || '',
    thumbnailUrl: thumbnail,
    uploadDate: item?.published_at || item?.modified_at || '',
    duration: isoDuration(item?.duration),
    contentUrl: absolute(content, origin),
    embedUrl: embed,
    year: String(item?.published_at || '').slice(0, 4)
  };
}

/**
 * The VideoObject for an item page. The rights half of it appears only when
 * the editor has marked the item original — see shared/rights.js.
 */
export function videoSchema(item, origin = SITE_ORIGIN) {
  const facts = videoFacts(item, origin);
  return {
    '@type': 'VideoObject',
    '@id': `${facts.canonical}#video`,
    name: facts.name,
    description: facts.description,
    thumbnailUrl: [facts.thumbnailUrl],
    uploadDate: facts.uploadDate,
    duration: facts.duration || undefined,
    contentUrl: facts.contentUrl || undefined,
    embedUrl: facts.embedUrl || undefined,
    inLanguage: 'bn',
    isFamilyFriendly: true,
    isAccessibleForFree: true,
    author: { '@id': `${origin}/#person` },
    publisher: { '@id': `${origin}/#organization` },
    ...rightsBlock(item, origin),
    mainEntityOfPage: facts.canonical
  };
}

/**
 * The <video:video> block for the sitemap. Returns '' when the video has no
 * playable address at all — an entry with neither content_loc nor player_loc
 * is rejected outright, and one bad entry can hold up the whole file.
 */
export function videoSitemapBlock(item, origin = SITE_ORIGIN, esc = (value) => value) {
  const facts = videoFacts(item, origin);
  if (!facts.contentUrl && !facts.embedUrl) return '';

  return [
    '    <video:video>',
    `      <video:thumbnail_loc>${esc(facts.thumbnailUrl)}</video:thumbnail_loc>`,
    `      <video:title>${esc(facts.name)}</video:title>`,
    `      <video:description>${esc(facts.description)}</video:description>`,
    facts.contentUrl ? `      <video:content_loc>${esc(facts.contentUrl)}</video:content_loc>` : '',
    facts.embedUrl ? `      <video:player_loc>${esc(facts.embedUrl)}</video:player_loc>` : '',
    facts.duration ? `      <video:duration>${durationSeconds(facts.duration)}</video:duration>` : '',
    facts.uploadDate
      ? `      <video:publication_date>${esc(facts.uploadDate)}</video:publication_date>`
      : '',
    '      <video:family_friendly>yes</video:family_friendly>',
    '      <video:requires_subscription>no</video:requires_subscription>',
    '      <video:live>no</video:live>',
    `      <video:uploader info="${esc(origin)}/">${esc(PERSON_NAME)}</video:uploader>`,
    '    </video:video>'
  ]
    .filter(Boolean)
    .join('\n');
}

const PLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" width="34" height="34" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>'"]/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]
  );

/**
 * The player, rendered the same way by the build and by the browser.
 *
 * Google will only index a video on a "watch page" — one where the video is
 * the main thing, not an illustration beside an article. It decides that from
 * the page it crawls, and the pre-rendered page used to contain a poster
 * image and a button with no player in it at all. A file we host now ships a
 * real <video> element in the HTML; `preload="none"` means that still costs
 * no bytes until someone presses play.
 *
 * A third-party embed stays a facade: putting the iframe in the markup would
 * pull YouTube's script into every page load, and the VideoObject already
 * hands the crawler the embedUrl. The iframe is built on the first click.
 */
export function playerHtml(item, { fallbackPoster = '' } = {}) {
  const facts = videoFacts(item);
  const source = facts.contentUrl || facts.embedUrl;
  if (!source) return '';
  const poster = escapeHtml(facts.thumbnailUrl || fallbackPoster);

  if (facts.contentUrl) {
    return `<div class="player">
      <video controls preload="none" playsinline poster="${poster}"
        width="1280" height="720" data-player-video>
        <source src="${escapeHtml(facts.contentUrl)}" type="video/mp4">
        Your browser cannot play this video. <a href="${escapeHtml(facts.contentUrl)}">Download it instead.</a>
      </video>
    </div>`;
  }

  return `<div class="player" data-player-embed="${escapeHtml(facts.embedUrl)}">
    <img class="player__poster" src="${poster}" alt="" width="1280" height="720" fetchpriority="high" decoding="async">
    <button class="player__start" type="button" data-player-start>
      <span>${PLAY_ICON}</span>
      <span class="visually-hidden">Play ${escapeHtml(item?.title || '')}</span>
    </button>
  </div>`;
}

/** Sitemaps count seconds where schema.org wants ISO 8601. */
export function durationSeconds(iso) {
  const match = String(iso || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}
