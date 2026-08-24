/**
 * Contract tests for the Worker's data layer.
 *
 * These drive the real modules against a stub D1 so a bug in what the API
 * *returns* is caught here rather than being hidden by a browser-side mock
 * that happens to be more generous than the server. Both bugs below shipped
 * once and were invisible to the page-level suite for exactly that reason.
 */

import { expect, test } from '@playwright/test';

import { adminNotes } from '../worker/src/lib/notes.js';
import { adminReviews } from '../worker/src/lib/reviews.js';
import {
  CONTENT_COLUMNS,
  INSERT_SQL,
  UPDATE_SQL,
  bindValues,
  listPublished,
  normalizeContent,
  toPublicItem
} from '../worker/src/lib/content.js';
import {
  accessToken,
  inspectUrl,
  normalisePath,
  pageViews,
  searchQueries,
  serviceAccount
} from '../worker/src/lib/google.js';
import { rightsBlock, rightsFor } from '../shared/rights.js';
import { canonicalPair, isMirrorPair, itemInCategory, CATEGORIES } from '../shared/taxonomy.js';
import { fullSitemap } from '../shared/sitemap.js';
import { SITE_ORIGIN, categoryUrl } from '../shared/urls.js';

/** Minimal D1 stand-in: records the SQL and bindings, replays fixed rows. */
function stubDb(rows, calls = []) {
  return {
    prepare(sql) {
      // One record per prepared statement; bind() fills its bindings in, so a
      // query that is prepared and then bound is not counted twice.
      const call = { sql, bindings: [] };
      calls.push(call);
      const statement = {
        bind(...bindings) {
          call.bindings = bindings;
          return statement;
        },
        all: async () => ({ results: rows }),
        first: async () => rows[0] ?? null
      };
      return statement;
    }
  };
}

test.describe('worker api contracts', () => {
  test('the notes moderation list keeps the approved flag', async () => {
    const env = {
      DB: stubDb([
        {
          id: 1,
          name: 'Nusrat',
          message: 'Lovely',
          city: 'Dhaka',
          avatar_url: '',
          hearts: 3,
          pinned: 0,
          approved: 1,
          created_at: '2026-08-10T00:00:00Z'
        }
      ])
    };

    const payload = await (await adminNotes(env, 'https://www.musfiqrfarhan.blog')).json();
    // Without this the dashboard reads every note as unapproved, so the
    // button says "Approve" again straight after a successful approve.
    expect(payload.notes[0]).toHaveProperty('approved');
    expect(payload.notes[0].approved).toBe(1);
  });

  test('the ratings moderation list keeps the approved flag', async () => {
    const env = {
      DB: stubDb([
        {
          id: 1,
          name: 'Sadia',
          rating: 5,
          body: 'Best natok of the year.',
          content_slug: 'tor-preme-pagol',
          approved: 1,
          created_at: '2026-08-11T00:00:00Z'
        }
      ])
    };

    const payload = await (await adminReviews(env, 'https://www.musfiqrfarhan.blog')).json();
    expect(payload.reviews[0]).toHaveProperty('approved');
    expect(payload.reviews[0].approved).toBe(1);
  });

  test('a category query matches the name in either taxonomy position', async () => {
    const calls = [];
    const env = { DB: stubDb([], calls) };
    await listPublished(env, { category: 'Eid Special' });

    const query = calls.find((call) => call.sql.includes('FROM content'));
    // "Eid Special" is a category and a subcategory of five others. Matching
    // c.category alone left /c/eid-special/ empty however much was published.
    expect(query.sql).toContain('c.category = ? OR c.subcategory = ?');
    expect(query.bindings.slice(0, 2)).toEqual(['Eid Special', 'Eid Special']);
  });

  /**
   * The rights column is only as good as its round trip. Left out of the
   * SELECT list, or out of the bindings, and the dashboard would show a choice
   * the database never stored.
   */
  test('the rights mode survives the trip to the database and back', () => {
    expect(CONTENT_COLUMNS, 'rights_mode is selected').toContain('rights_mode');
    for (const sql of [INSERT_SQL, UPDATE_SQL]) {
      expect(sql, 'rights_mode is written').toContain('rights_mode');
    }

    const base = {
      type: 'post',
      category: 'Blog',
      image: '/assets/img/og-card.jpg',
      description: 'Something to publish.'
    };
    const auto = normalizeContent({ ...base, title: 'Unset' });
    const forced = normalizeContent({ ...base, title: 'Theirs', rights_mode: 'shared' });
    expect(auto.error, auto.error).toBeUndefined();
    expect(auto.rightsMode, 'unset means automatic').toBe('auto');
    expect(forced.rightsMode, 'an explicit choice is respected').toBe('shared');
    // Anything else is not a mode, and must not reach the column.
    expect(normalizeContent({ ...base, title: 'Junk', rights_mode: 'whatever' }).rightsMode).toBe('auto');

    const values = bindValues(forced);
    expect(values.length, 'a binding for every ?').toBe((INSERT_SQL.match(/\?/g) || []).length);
    expect(values).toContain('shared');

    expect(toPublicItem({ rights_mode: 'own', published: 1, indexable: 1 }).rights_mode).toBe('own');
    // Rows written before the column existed read as automatic.
    expect(toPublicItem({ published: 1, indexable: 1 }).rights_mode).toBe('auto');
  });

  /**
   * The rule the whole feature rests on: where the media came from decides
   * whose rights the page claims, with no editor input at all.
   */
  test('provenance is read from the media, not asked for', () => {
    const hosted = {
      type: 'video',
      published_at: '2026-05-14T00:00:00+06:00',
      attachment_url: 'https://mrf-api.gadget02030.workers.dev/media/2026-05-14/clip.mp4'
    };
    const shared = {
      type: 'video',
      published_at: '2026-08-01T00:00:00+06:00',
      video_url: 'https://www.youtube.com/watch?v=t8d6rWQQl8g'
    };

    expect(rightsFor(hosted).mode, 'an upload is ours').toBe('own');
    expect(rightsFor(shared).mode, 'a pasted link is not').toBe('shared');
    expect(rightsFor(shared).source.name).toBe('YouTube');

    // A stored choice overrules the guess in either direction.
    expect(rightsFor({ ...shared, rights_mode: 'own' }).mode).toBe('own');
    expect(rightsFor({ ...hosted, rights_mode: 'shared' }).mode).toBe('shared');

    // And the schema follows: a claim on one, attribution on the other.
    const ours = rightsBlock(hosted, SITE_ORIGIN, { performer: true });
    expect(ours.license).toContain('/terms-of-service.html#copyright');
    expect(ours.copyrightHolder).toBeTruthy();
    expect(ours.actor, 'no performer credit needed on our own upload').toBeUndefined();

    const theirs = rightsBlock(shared, SITE_ORIGIN, { performer: true });
    expect(theirs.license, 'never claim a licence over an embed').toBeUndefined();
    expect(theirs.copyrightHolder).toBeUndefined();
    expect(theirs.sourceOrganization.name).toBe('YouTube');
    expect(theirs.isBasedOn).toBe(shared.video_url);
    expect(theirs.actor, 'he is the performer, not the owner').toBeTruthy();
  });
});

/**
 * The Google integration is optional by design: the site has to work with no
 * service account configured, and has to keep working when Google is having a
 * bad day. These pin the "switched off" and "unreachable" paths, which are the
 * ones nobody exercises by hand.
 */
test.describe('google integration', () => {
  test('everything reports itself off when no service account is set', async () => {
    const env = {};
    expect(serviceAccount(env), 'no account').toBeNull();
    expect(await accessToken(env, 'scope'), 'no token, and no throw').toBe('');
    expect(await pageViews(env), 'no analytics').toBeNull();
    expect(await searchQueries(env), 'no query report').toBeNull();
    expect(await inspectUrl(env, 'https://www.musfiqrfarhan.blog/'), 'no inspection').toBeNull();
  });

  test('malformed credentials are treated as absent, not as a crash', async () => {
    expect(serviceAccount({ GOOGLE_SERVICE_ACCOUNT: 'not json' })).toBeNull();
    expect(serviceAccount({ GOOGLE_SERVICE_ACCOUNT: '{}' }), 'no key, no account').toBeNull();
    expect(
      serviceAccount({ GOOGLE_SERVICE_ACCOUNT: '{"client_email":"a@b.c"}' }),
      'half an account is no account'
    ).toBeNull();
  });

  test('analytics paths are folded so a post has one total', () => {
    // GA4 reports /a/b, /a/b/ and /a/b?utm=… as three rows for one page.
    expect(normalisePath('/new-natok/tor-preme-pagol/')).toBe('/new-natok/tor-preme-pagol');
    expect(normalisePath('/new-natok/tor-preme-pagol?utm_source=fb')).toBe('/new-natok/tor-preme-pagol');
    expect(normalisePath('/new-natok/tor-preme-pagol#top')).toBe('/new-natok/tor-preme-pagol');
    expect(normalisePath('new-natok/tor-preme-pagol'), 'always rooted').toBe('/new-natok/tor-preme-pagol');
    expect(normalisePath('/'), 'the home page keeps its slash').toBe('/');
  });
});

test.describe('taxonomy', () => {
  test('an item filed under a subcategory belongs to that section too', () => {
    const item = { category: 'New Natok', subcategory: 'Eid Special' };
    expect(itemInCategory(item, 'New Natok')).toBe(true);
    expect(itemInCategory(item, 'Eid Special')).toBe(true);
    expect(itemInCategory(item, 'Press')).toBe(false);
  });

  test('each mirrored pair resolves to exactly one canonical url', () => {
    const owners = new Set();
    let mirrors = 0;

    for (const category of CATEGORIES) {
      for (const sub of category.subcategories) {
        const canonical = canonicalPair(category.name, sub);
        if (!canonical) continue;
        owners.add(`${canonical.category}|${canonical.subcategory}`);
        if (isMirrorPair(category.name, sub)) mirrors += 1;
      }
    }

    // Five pairs list each other, so ten URLs collapse onto five.
    expect(mirrors).toBe(5);
    expect(owners.size).toBe(5);

    // The two halves of a pair must agree on which URL is canonical.
    expect(canonicalPair('New Natok', 'Natok & Telefilm')).toEqual(
      canonicalPair('Natok & Telefilm', 'New Natok')
    );
    expect(isMirrorPair('New Natok', 'Natok & Telefilm')).toBe(false);
    expect(isMirrorPair('Natok & Telefilm', 'New Natok')).toBe(true);
  });

  test('the sitemap lists each intersection once', () => {
    const xml = fullSitemap({ items: [], gallery: [] });
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(new Set(locs).size, 'no duplicate urls').toBe(locs.length);

    for (const category of CATEGORIES) {
      // Every section is listed exactly once, at whichever URL is canonical
      // for it — the /c/ listing, or the hub for Gallery and Blog.
      expect(locs, `${category.slug} listing`).toContain(categoryUrl(category.name));
      expect(
        locs.filter((loc) => loc === categoryUrl(category.name)),
        `${category.slug} listed once`
      ).toHaveLength(1);

      for (const sub of category.subcategories) {
        const url = categoryUrl(category.name, sub);
        if (isMirrorPair(category.name, sub)) {
          expect(locs, `${url} is a mirror and must stay out`).not.toContain(url);
        } else {
          expect(locs, `${url} must be listed`).toContain(url);
        }
      }
    }
  });
});
