/** Moderation views for love notes and star ratings. */

import { adminApi } from './api.js';
import { $, confirmAction, esc, formatDate, toast } from './ui.js';

/* ------------------------------------------------------------ love notes */

export function notesMarkup() {
  return `<div class="panel">
    <div class="panel__head">
      <h2>Love notes</h2>
      <button class="btn btn--ghost btn--sm" type="button" data-notes-refresh>Refresh</button>
    </div>
    <p style="font-size:.82rem;color:var(--ink-faint);margin-bottom:1rem">
      Approved notes appear on the fan wall and in the ticker at the top of every page.
      Pin a note to keep it at the front of both.
    </p>
    <div class="rows" data-notes-rows><p class="empty">Loading…</p></div>
  </div>`;
}

function noteCard(note) {
  const approved = Number(note.approved) === 1;
  const avatar = note.avatar_url
    ? `<img class="note-card__avatar" src="${esc(note.avatar_url)}" alt="" loading="lazy" decoding="async">`
    : '';
  return `<article class="note-card">
    <div class="note-card__head">
      ${avatar}
      <div>
        <strong>${esc(note.name)}</strong>
        ${note.city ? `<span style="color:var(--ink-faint);font-size:.78rem"> · ${esc(note.city)}</span>` : ''}
        <div style="font-size:.72rem;color:var(--ink-faint)">${esc(formatDate(note.created_at))} · ${
          note.hearts
        } hearts</div>
      </div>
      <span class="tag ${approved ? 'tag--live' : 'tag--draft'}" style="margin-left:auto">
        ${approved ? 'Approved' : 'Waiting'}
      </span>
      ${Number(note.pinned) ? '<span class="tag">Pinned</span>' : ''}
    </div>
    <p style="font-size:.9rem">${esc(note.message)}</p>
    <div class="row__actions" style="justify-content:flex-start">
      <button class="btn ${approved ? 'btn--ghost' : 'btn--primary'} btn--sm" type="button"
        data-note-approve="${note.id}" data-approved="${approved ? 1 : 0}">
        ${approved ? 'Unapprove' : 'Approve'}
      </button>
      <button class="btn btn--ghost btn--sm" type="button" data-note-pin="${note.id}"
        data-pinned="${Number(note.pinned) ? 1 : 0}">${Number(note.pinned) ? 'Unpin' : 'Pin'}</button>
      <button class="btn btn--danger btn--sm" type="button" data-note-delete="${note.id}">Delete</button>
    </div>
  </article>`;
}

export function initNotes(root, { onChange = () => {} } = {}) {
  const rows = $('[data-notes-rows]', root);

  async function load() {
    try {
      const data = await adminApi.listNotes();
      rows.innerHTML = data.notes.length
        ? data.notes.map(noteCard).join('')
        : '<p class="empty">No love notes have been sent yet.</p>';
    } catch (error) {
      rows.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    }
  }

  $('[data-notes-refresh]', root).addEventListener('click', load);

  rows.addEventListener('click', async (event) => {
    const approve = event.target.closest('[data-note-approve]');
    const pin = event.target.closest('[data-note-pin]');
    const remove = event.target.closest('[data-note-delete]');

    try {
      if (approve) {
        await adminApi.updateNote(approve.dataset.noteApprove, {
          approved: approve.dataset.approved !== '1'
        });
        toast(approve.dataset.approved === '1' ? 'Note hidden.' : 'Note approved — it is live now.');
      } else if (pin) {
        await adminApi.updateNote(pin.dataset.notePin, { pinned: pin.dataset.pinned !== '1' });
        toast('Updated.');
      } else if (remove) {
        if (!confirmAction('Delete this note permanently?')) return;
        await adminApi.deleteNote(remove.dataset.noteDelete);
        toast('Note deleted.');
      } else {
        return;
      }
      load();
      onChange();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  load();
  return { reload: load };
}

/* --------------------------------------------------------------- ratings */

export function reviewsMarkup() {
  return `<div class="panel">
    <div class="panel__head">
      <h2>Ratings and notes</h2>
      <button class="btn btn--ghost btn--sm" type="button" data-reviews-refresh>Refresh</button>
    </div>
    <p style="font-size:.82rem;color:var(--ink-faint);margin-bottom:1rem">
      Approved ratings show on the page they were left on and feed its average score.
    </p>
    <div class="rows" data-review-rows><p class="empty">Loading…</p></div>
  </div>`;
}

function reviewCard(review) {
  const approved = Number(review.approved) === 1;
  const stars = Math.max(1, Math.min(5, Number(review.rating) || 5));
  return `<article class="note-card">
    <div class="note-card__head">
      <strong>${esc(review.name)}</strong>
      <span style="color:var(--warn)">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>
      <span class="tag ${approved ? 'tag--live' : 'tag--draft'}" style="margin-left:auto">
        ${approved ? 'Approved' : 'Waiting'}
      </span>
    </div>
    <p style="font-size:.9rem">${esc(review.body)}</p>
    <div style="font-size:.72rem;color:var(--ink-faint)">
      ${esc(formatDate(review.created_at))}${review.content_slug ? ` · on ${esc(review.content_slug)}` : ''}
    </div>
    <div class="row__actions" style="justify-content:flex-start">
      <button class="btn ${approved ? 'btn--ghost' : 'btn--primary'} btn--sm" type="button"
        data-review-approve="${review.id}" data-approved="${approved ? 1 : 0}">
        ${approved ? 'Unapprove' : 'Approve'}
      </button>
      <button class="btn btn--danger btn--sm" type="button" data-review-delete="${review.id}">Delete</button>
    </div>
  </article>`;
}

export function initReviews(root, { onChange = () => {} } = {}) {
  const rows = $('[data-review-rows]', root);

  async function load() {
    try {
      const data = await adminApi.listReviews();
      rows.innerHTML = data.reviews.length
        ? data.reviews.map(reviewCard).join('')
        : '<p class="empty">No ratings have been submitted yet.</p>';
    } catch (error) {
      rows.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    }
  }

  $('[data-reviews-refresh]', root).addEventListener('click', load);

  rows.addEventListener('click', async (event) => {
    const approve = event.target.closest('[data-review-approve]');
    const remove = event.target.closest('[data-review-delete]');
    try {
      if (approve) {
        await adminApi.setReviewApproved(approve.dataset.reviewApprove, approve.dataset.approved !== '1');
        toast('Updated.');
      } else if (remove) {
        if (!confirmAction('Delete this rating permanently?')) return;
        await adminApi.deleteReview(remove.dataset.reviewDelete);
        toast('Rating deleted.');
      } else {
        return;
      }
      load();
      onChange();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  load();
  return { reload: load };
}
