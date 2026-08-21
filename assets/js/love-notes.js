/**
 * The love-note wall: the dedicated page where fans write to Musfiq.
 *
 * Notes are moderated before they appear here or in the sitewide ticker.
 * Hearts are stored per browser so one visitor cannot inflate a count by
 * holding down the button.
 */

import { api } from './api.js';
import { $, attr, esc, formatDate, initials, on } from './dom.js';

const HEART_KEY = 'mrf_hearted_notes';
const PAGE_SIZE = 24;

function heartedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(HEART_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function rememberHeart(id) {
  try {
    const set = heartedSet();
    set.add(id);
    localStorage.setItem(HEART_KEY, JSON.stringify([...set]));
  } catch {
    /* private browsing — the heart still registers server-side */
  }
}

function noteMarkup(note, hearted) {
  const avatar = note.avatar_url
    ? `<img class="note__avatar" src="${attr(note.avatar_url)}" alt="" width="42" height="42" loading="lazy" decoding="async">`
    : `<span class="note__initial" aria-hidden="true">${esc(initials(note.name))}</span>`;

  return `<article class="note${note.pinned ? ' note--pinned' : ''}">
    <div class="note__head">
      ${avatar}
      <div>
        <p class="note__name">${esc(note.name)}</p>
        ${note.city ? `<p class="note__place">${esc(note.city)}</p>` : ''}
      </div>
    </div>
    <p class="note__message">${esc(note.message)}</p>
    <div class="note__foot">
      <time datetime="${attr(note.created_at || '')}">${esc(
        formatDate(note.created_at, { day: 'numeric', month: 'short', year: 'numeric' })
      )}</time>
      <button class="heart-button${hearted ? ' is-active' : ''}" type="button"
        data-heart="${attr(note.id)}" ${hearted ? 'disabled' : ''}
        aria-label="Send a heart to ${attr(note.name)}'s note">
        ♥ <span data-heart-count>${Number(note.hearts || 0)}</span>
      </button>
    </div>
  </article>`;
}

export async function initLoveNotePage() {
  const wall = $('[data-note-wall]');
  const form = $('[data-note-form]');
  const status = $('[data-note-status]');
  const countCell = $('[data-note-total]');
  const heartCell = $('[data-heart-total]');
  const more = $('[data-note-more]');
  if (!wall) return;

  let offset = 0;
  const hearted = heartedSet();

  async function load(append = false) {
    try {
      const data = await api.loveNotes(PAGE_SIZE, offset);
      const html = data.notes.map((note) => noteMarkup(note, hearted.has(note.id))).join('');
      if (append) wall.insertAdjacentHTML('beforeend', html);
      else wall.innerHTML = html || '<p class="muted">No notes yet. Yours can be the very first one.</p>';

      if (countCell) countCell.textContent = new Intl.NumberFormat('en').format(data.count || 0);
      if (heartCell) heartCell.textContent = new Intl.NumberFormat('en').format(data.hearts || 0);

      offset += data.notes.length;
      if (more) more.hidden = offset >= (data.count || 0) || data.notes.length === 0;
    } catch {
      if (!append) wall.innerHTML = '<p class="muted">Notes could not load right now. Please refresh in a moment.</p>';
    }
  }

  on(more, 'click', () => load(true));

  on(wall, 'click', async (event) => {
    const button = event.target.closest('[data-heart]');
    if (!button || button.disabled) return;
    const id = Number(button.dataset.heart);
    button.disabled = true;
    try {
      const result = await api.heartNote(id);
      $('[data-heart-count]', button).textContent = result.hearts;
      button.classList.add('is-active');
      rememberHeart(id);
    } catch {
      button.disabled = false;
    }
  });

  on(form, 'submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    status.dataset.state = '';
    status.textContent = 'Sending your note…';
    try {
      const result = await api.submitLoveNote({
        name: values.name,
        message: values.message,
        city: values.city,
        avatar_url: values.avatar_url,
        website: values.website
      });
      form.reset();
      status.dataset.state = 'success';
      status.textContent = result.message || 'Thank you. Your note will appear once it is approved.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.message || 'Something went wrong. Please try again.';
    }
  });

  await load();
}
