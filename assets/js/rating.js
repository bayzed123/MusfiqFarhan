/**
 * Star rating widget. Every post, video and gallery page mounts one by
 * putting `<div data-rating="<slug>"></div>` on the page.
 *
 * Ratings are moderated, so a fresh submission is acknowledged but does not
 * appear until it is approved in the dashboard.
 */

import { api } from './api.js';
import { $, addJsonLd, attr, esc, formatDate, on } from './dom.js';

function summaryMarkup({ average, count }) {
  const rounded = Math.round(average);
  return `<div class="rating-summary">
    <span class="rating-summary__score">${average ? average.toFixed(1) : '—'}</span>
    <div>
      <span class="stars" aria-hidden="true">${'★'.repeat(rounded)}${'☆'.repeat(Math.max(0, 5 - rounded))}</span>
      <p class="section__blurb">${count} ${count === 1 ? 'rating' : 'ratings'} from the audience</p>
    </div>
  </div>`;
}

function reviewMarkup(review) {
  const rounded = Math.max(1, Math.min(5, Number(review.rating) || 5));
  return `<article class="review">
    <span class="stars" aria-label="${rounded} out of 5">${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}</span>
    <p>${esc(review.body)}</p>
    <strong>${esc(review.name)}</strong>
    <span class="note__place"> · ${esc(formatDate(review.created_at, { month: 'short', year: 'numeric' }))}</span>
  </article>`;
}

function formMarkup(slug) {
  const stars = [5, 4, 3, 2, 1]
    .map(
      (value) => `<input type="radio" name="rating" id="star-${value}" value="${value}"${
        value === 5 ? ' checked' : ''
      } required>
      <label for="star-${value}" title="${value} star${value > 1 ? 's' : ''}">★<span class="visually-hidden">${value} stars</span></label>`
    )
    .join('');

  return `<form data-rating-form novalidate>
    <div class="field">
      <label id="rating-label">Your rating</label>
      <div class="star-input" role="radiogroup" aria-labelledby="rating-label">${stars}</div>
    </div>
    <div class="field">
      <label for="rating-name-${attr(slug)}">Your name</label>
      <input id="rating-name-${attr(slug)}" name="name" type="text" maxlength="80" required autocomplete="name">
    </div>
    <div class="field">
      <label for="rating-note-${attr(slug)}">Your note</label>
      <textarea id="rating-note-${attr(slug)}" name="body" maxlength="500" required
        placeholder="What did you think of this one?"></textarea>
    </div>
    <div class="field field--honeypot" aria-hidden="true">
      <label for="rating-website-${attr(slug)}">Leave this empty</label>
      <input id="rating-website-${attr(slug)}" name="website" type="text" tabindex="-1" autocomplete="off">
    </div>
    <button class="button button--primary button--block" type="submit">Send my rating</button>
    <p class="form-status" data-rating-status role="status"></p>
  </form>`;
}

/**
 * @param {HTMLElement} mount element carrying `data-rating="<slug>"`
 * @param {{ title?: string }} [meta] used for the aggregate-rating schema
 */
export async function mountRating(mount, meta = {}) {
  const slug = mount.dataset.rating;
  if (!slug) return;

  mount.innerHTML = `<section class="panel" aria-labelledby="rating-title-${attr(slug)}">
    <h2 id="rating-title-${attr(slug)}">Rate this${meta.title ? '' : ' page'}</h2>
    <div data-rating-summary></div>
    ${formMarkup(slug)}
    <div class="review-list" data-rating-list style="margin-top:1rem"></div>
  </section>`;

  const summary = $('[data-rating-summary]', mount);
  const list = $('[data-rating-list]', mount);
  const status = $('[data-rating-status]', mount);

  async function load() {
    try {
      const data = await api.reviews(slug);
      summary.innerHTML = summaryMarkup(data);
      list.innerHTML = data.reviews.length
        ? data.reviews.map(reviewMarkup).join('')
        : '<p class="section__blurb">No notes yet — yours would be the first.</p>';

      // Only publish AggregateRating once real ratings exist, so the markup
      // never claims a score the page cannot show.
      if (data.count > 0 && meta.title) {
        addJsonLd(
          {
            '@context': 'https://schema.org',
            '@type': 'AggregateRating',
            itemReviewed: { '@type': 'CreativeWork', name: meta.title },
            ratingValue: data.average,
            bestRating: 5,
            worstRating: 1,
            ratingCount: data.count
          },
          'rating-schema'
        );
      }
    } catch {
      summary.innerHTML = '<p class="section__blurb">Ratings are loading…</p>';
    }
  }

  on($('[data-rating-form]', mount), 'submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    status.dataset.state = '';
    status.textContent = 'Sending…';
    try {
      const result = await api.submitReview({
        content_slug: slug,
        name: data.name,
        rating: Number(data.rating),
        body: data.body,
        website: data.website
      });
      form.reset();
      status.dataset.state = 'success';
      status.textContent = result.message || 'Thank you. Your rating is waiting for approval.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.message || 'Something went wrong. Please try again.';
    }
  });

  await load();
}

/** Mount every rating widget on the page. */
export function initRatings(meta = {}) {
  for (const mount of document.querySelectorAll('[data-rating]')) mountRating(mount, meta);
}
