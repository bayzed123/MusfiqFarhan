/**
 * Canonical taxonomy for the Musfiq R. Farhan official site.
 *
 * This is the single source of truth shared by the Cloudflare Worker API,
 * the public site and the admin dashboard. Every published item is validated
 * against this file, which is what guarantees an upload always lands in the
 * category it was filed under.
 */

/** @typedef {{ name: string, slug: string, subcategories: string[], blurb: string, rail: boolean }} Category */

/** @type {Category[]} */
export const CATEGORIES = [
  {
    name: 'Premium',
    slug: 'premium',
    subcategories: ['Popular', 'Eid Special'],
    blurb: 'Hand-picked highlights from the official archive.',
    rail: true
  },
  {
    name: 'Gallery',
    slug: 'gallery',
    subcategories: ['Portraits', 'Posters', 'Behind the Scenes', 'Wallpapers'],
    blurb: 'Portraits, posters and stills in full resolution.',
    rail: true
  },
  {
    name: 'Poster Release',
    slug: 'poster-release',
    subcategories: ['Recent Releases', 'Eid Special'],
    blurb: 'First-look posters as each project is announced.',
    rail: true
  },
  {
    name: 'Behind the Scenes',
    slug: 'behind-the-scenes',
    subcategories: ['Studio Notes', 'Making Of'],
    blurb: 'Set diaries, studio notes and making-of moments.',
    rail: true
  },
  {
    name: 'New Teaser',
    slug: 'new-teaser',
    subcategories: ['Recent Releases'],
    blurb: 'Teasers and trailers ahead of every premiere.',
    rail: true
  },
  {
    name: 'New Natok',
    slug: 'new-natok',
    subcategories: ['Natok & Telefilm', 'Eid Special'],
    blurb: 'Full natok releases, newest first.',
    rail: true
  },
  {
    name: 'Short Clips',
    slug: 'short-clips',
    subcategories: ['Natok & Telefilm'],
    blurb: 'Short scenes, funny clips and vertical cuts.',
    rail: true
  },
  {
    name: 'Blog',
    slug: 'blog',
    subcategories: ['Recent Releases', 'Biography & Journey'],
    blurb: 'Long-form writing from the official desk.',
    rail: true
  },
  {
    name: 'Press',
    slug: 'press',
    subcategories: ['Recent Releases'],
    blurb: 'Interviews, features and press coverage.',
    rail: true
  },
  {
    name: 'Lifestyle & Fashion',
    slug: 'lifestyle-fashion',
    subcategories: ['Fashion', 'Portraits'],
    blurb: 'Style, campaigns and off-camera looks.',
    rail: true
  },
  {
    name: 'Wallpapers',
    slug: 'wallpapers',
    subcategories: ['Portraits', 'Archive'],
    blurb: 'Phone and desktop wallpapers to download.',
    rail: true
  },
  {
    name: 'Biography & Journey',
    slug: 'biography-journey',
    subcategories: ['Biography', 'Career Journey'],
    blurb: 'The road from radio to screen, documented.',
    rail: true
  },
  {
    name: 'Natok & Telefilm',
    slug: 'natok-telefilm',
    subcategories: ['New Natok', 'Short Clips'],
    blurb: 'The complete natok and telefilm archive.',
    rail: true
  },
  {
    name: 'Recent Releases',
    slug: 'recent-releases',
    subcategories: ['Popular', 'Eid Special'],
    blurb: 'Everything published in the last few weeks.',
    rail: true
  },
  {
    name: 'Popular',
    slug: 'popular',
    subcategories: ['Eid Special', 'Recent Releases'],
    blurb: 'What the audience is watching most.',
    rail: true
  },
  {
    name: 'Eid Special',
    slug: 'eid-special',
    subcategories: ['Recent Releases', 'Popular'],
    blurb: 'Eid premieres and festival specials.',
    rail: true
  }
];

/**
 * Grouping used by the desktop mega menu so sixteen categories stay readable.
 */
export const NAV_GROUPS = [
  { label: 'Watch', categories: ['New Natok', 'New Teaser', 'Short Clips', 'Natok & Telefilm'] },
  { label: 'Look', categories: ['Gallery', 'Poster Release', 'Wallpapers', 'Lifestyle & Fashion'] },
  { label: 'Read', categories: ['Blog', 'Press', 'Biography & Journey', 'Behind the Scenes'] },
  { label: 'Trending', categories: ['Premium', 'Popular', 'Recent Releases', 'Eid Special'] }
];

/**
 * Content kinds shown in the admin composer. Picking a kind fills in the
 * storage type, category and subcategory, so an editor never has to guess
 * where a poster or a teaser belongs.
 *
 * `type` maps to the `content.type` column: video | post | featured | gallery.
 */
export const KINDS = [
  {
    id: 'poster',
    label: 'Poster',
    type: 'post',
    category: 'Poster Release',
    subcategory: 'Recent Releases',
    accepts: 'image',
    hint: 'A release poster with its own page and download.'
  },
  {
    id: 'short-video',
    label: 'Short video',
    type: 'video',
    category: 'Short Clips',
    subcategory: 'Natok & Telefilm',
    accepts: 'video',
    hint: 'Vertical or short-form cut, under a few minutes.'
  },
  {
    id: 'behind-the-scenes',
    label: 'Behind the scenes',
    type: 'video',
    category: 'Behind the Scenes',
    subcategory: 'Studio Notes',
    accepts: 'any',
    hint: 'Set footage, studio notes or a making-of gallery.'
  },
  {
    id: 'natok-teaser',
    label: 'Natok teaser',
    type: 'video',
    category: 'New Teaser',
    subcategory: 'Recent Releases',
    accepts: 'video',
    hint: 'Teaser or trailer for an upcoming release.'
  },
  {
    id: 'full-natok',
    label: 'Full natok',
    type: 'video',
    category: 'New Natok',
    subcategory: 'Natok & Telefilm',
    accepts: 'video',
    hint: 'A complete licensed natok or telefilm.'
  },
  {
    id: 'image-gallery',
    label: 'Image gallery',
    type: 'gallery',
    category: 'Gallery',
    subcategory: 'Portraits',
    accepts: 'image',
    hint: 'A set of stills that appears in the gallery grid.'
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle & fashion',
    type: 'post',
    category: 'Lifestyle & Fashion',
    subcategory: 'Fashion',
    accepts: 'any',
    hint: 'Style stories, campaigns and off-camera looks.'
  },
  {
    id: 'friends-adda',
    label: 'Friends adda',
    type: 'video',
    category: 'Premium',
    subcategory: 'Popular',
    accepts: 'video',
    hint: 'Adda sessions and conversations with friends.'
  },
  {
    id: 'blog',
    label: 'Blog post',
    type: 'post',
    category: 'Blog',
    subcategory: 'Recent Releases',
    accepts: 'any',
    hint: 'Long-form writing with a full article body.'
  },
  {
    id: 'funny-clips',
    label: 'Funny clip',
    type: 'video',
    category: 'Short Clips',
    subcategory: 'Natok & Telefilm',
    accepts: 'video',
    hint: 'Light, funny moments and outtakes.'
  },
  {
    id: 'press',
    label: 'Press feature',
    type: 'post',
    category: 'Press',
    subcategory: 'Recent Releases',
    accepts: 'any',
    hint: 'Interviews and coverage from other publications.'
  },
  {
    id: 'wallpaper',
    label: 'Wallpaper',
    type: 'gallery',
    category: 'Wallpapers',
    subcategory: 'Portraits',
    accepts: 'image',
    hint: 'High-resolution wallpapers offered for download.'
  },
  {
    id: 'biography',
    label: 'Biography chapter',
    type: 'post',
    category: 'Biography & Journey',
    subcategory: 'Biography',
    accepts: 'any',
    hint: 'A chapter of the career story.'
  },
  {
    id: 'featured',
    label: 'Hero banner',
    type: 'featured',
    category: 'Premium',
    subcategory: 'Popular',
    accepts: 'any',
    hint: 'The large banner at the very top of the homepage.'
  },
  {
    id: 'natok-telefilm',
    label: 'Natok & telefilm archive',
    type: 'video',
    category: 'Natok & Telefilm',
    subcategory: 'New Natok',
    accepts: 'video',
    hint: 'A complete archive item for the Natok & Telefilm section.'
  },
  {
    id: 'popular',
    label: 'Popular highlight',
    type: 'post',
    category: 'Popular',
    subcategory: 'Recent Releases',
    accepts: 'any',
    hint: 'A highlighted item routed directly to Popular.'
  },
  {
    id: 'recent-releases',
    label: 'Recent release',
    type: 'post',
    category: 'Recent Releases',
    subcategory: 'Popular',
    accepts: 'any',
    hint: 'A newly published item routed directly to Recent Releases.'
  },
  {
    id: 'eid-special',
    label: 'Eid special',
    type: 'post',
    category: 'Eid Special',
    subcategory: 'Recent Releases',
    accepts: 'any',
    hint: 'A festival or Eid item routed directly to Eid Special.'
  }
];

export const CONTENT_TYPES = ['video', 'post', 'featured', 'gallery'];

/** Homepage rail order. The hero and the poster strip are rendered separately. */
export const HOME_RAILS = [
  'Premium',
  'New Natok',
  'New Teaser',
  'Short Clips',
  'Behind the Scenes',
  'Gallery',
  'Blog',
  'Lifestyle & Fashion',
  'Biography & Journey',
  'Press',
  'Wallpapers',
  'Recent Releases'
];

const byName = new Map(CATEGORIES.map((category) => [category.name.toLowerCase(), category]));
const bySlug = new Map(CATEGORIES.map((category) => [category.slug, category]));
const kindById = new Map(KINDS.map((kind) => [kind.id, kind]));

export function findCategory(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return null;
  return byName.get(key) || bySlug.get(key) || null;
}

export function findKind(value) {
  return kindById.get(String(value ?? '').trim().toLowerCase()) || null;
}

export function categorySlug(name) {
  return findCategory(name)?.slug || '';
}

export function categoryName(slug) {
  return findCategory(slug)?.name || '';
}

/**
 * Slug rule for taxonomy names. "&" is dropped rather than spelled out, which
 * keeps a name that appears as both a category and a subcategory on one slug:
 * "Biography & Journey" is `biography-journey` in either position.
 */
export function subcategorySlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function findSubcategory(categoryValue, subValue) {
  const category = findCategory(categoryValue);
  if (!category) return '';
  const wanted = subcategorySlug(subValue);
  if (!wanted) return '';
  return category.subcategories.find((sub) => subcategorySlug(sub) === wanted) || '';
}

/**
 * Does this item belong on the listing for `name`?
 *
 * Nine of the sixteen names are both a category and someone else's
 * subcategory — "Eid Special" is a section of its own *and* a subcategory of
 * New Natok, Premium, Poster Release, Popular and Recent Releases. An item
 * filed New Natok / Eid Special therefore belongs on both listings. Matching
 * only the primary category is what left those pages empty.
 */
export function itemInCategory(item, name) {
  const wanted = findCategory(name)?.name;
  if (!wanted || !item) return false;
  return item.category === wanted || item.subcategory === wanted;
}

/** Items shown at /c/<a>/<b>/ — everything tagged with both names. */
export function itemInPair(item, a, b) {
  return itemInCategory(item, a) && (!b || itemInCategory(item, b));
}

/**
 * Two categories can list each other: New Natok has a "Natok & Telefilm"
 * subcategory and Natok & Telefilm has a "New Natok" one. Both URLs then
 * describe the same intersection, which is duplicate content. The pair whose
 * category is declared first in CATEGORIES owns the canonical URL; the mirror
 * still resolves for anyone who follows it, but says so in its head.
 *
 * @returns {{category: string, subcategory: string}|null} the canonical
 *   ordering, or null when this pair is not mirrored.
 */
export function canonicalPair(categoryValue, subValue) {
  const category = findCategory(categoryValue);
  const sub = findSubcategory(category?.name, subValue);
  if (!category || !sub) return null;
  const mirror = findCategory(sub);
  if (!mirror || !mirror.subcategories.includes(category.name)) return null;

  const order = CATEGORIES.indexOf(category) <= CATEGORIES.indexOf(mirror);
  const [owner, member] = order ? [category, mirror] : [mirror, category];
  return { category: owner.name, subcategory: member.name };
}

/** True when this URL is the mirror half of a pair and should not be indexed. */
export function isMirrorPair(categoryValue, subValue) {
  const canonical = canonicalPair(categoryValue, subValue);
  return Boolean(canonical) && canonical.category !== findCategory(categoryValue)?.name;
}

/**
 * Resolve whatever the admin (or an older record) supplied into a valid
 * category/subcategory pair. Falling back through the kind preset is what
 * stops an upload from disappearing into an unknown category.
 */
export function resolvePlacement({ kind, category, subcategory } = {}) {
  const preset = findKind(kind);
  // A selected publishing kind is a pipeline contract, not a hint. This
  // prevents a poster, teaser, biography chapter, or blog post from being
  // filed into a different top-level section by stale/manual form values.
  const resolvedCategory = preset ? findCategory(preset.category) : findCategory(category);
  if (!resolvedCategory) {
    return { ok: false, error: 'Pick a category from the official list.' };
  }
  const requestedSub = findSubcategory(resolvedCategory.name, subcategory);
  const presetSub = preset ? findSubcategory(resolvedCategory.name, preset.subcategory) : '';
  const resolvedSub = preset ? presetSub || resolvedCategory.subcategories[0] : requestedSub || resolvedCategory.subcategories[0];
  return {
    ok: true,
    category: resolvedCategory.name,
    categorySlug: resolvedCategory.slug,
    subcategory: resolvedSub,
    subcategorySlug: subcategorySlug(resolvedSub),
    kind: preset?.id || ''
  };
}

/** Categories whose items are primarily images rather than video. */
export const IMAGE_FIRST_CATEGORIES = new Set([
  'Gallery',
  'Poster Release',
  'Wallpapers',
  'Lifestyle & Fashion'
]);
