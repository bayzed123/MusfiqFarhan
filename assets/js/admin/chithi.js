/**
 * The Chithi inbox — private letters, readable only here.
 *
 * Not a moderation queue. Love notes and ratings have Approve buttons because
 * approving is what publishes them; there is nothing to approve here, because
 * there is nowhere for one of these to go. What the buttons do instead is keep
 * the inbox usable: mark what has been read, and put away what is dealt with.
 *
 * Every letter arrives with a way to answer it, so the contact details are
 * links rather than text — one tap to WhatsApp, one to email — and the time it
 * arrived is shown both ways: "3 hours ago" to scan, the exact Dhaka time to
 * quote back.
 */

import { adminApi } from './api.js';
import { $, confirmAction, esc, formatDateTime, timeAgo, toast } from './ui.js';

export function chithiMarkup() {
  return `<div class="panel">
    <div class="panel__head">
      <h2>Chithi</h2>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="btn btn--ghost btn--sm" type="button" data-chithi-box="inbox" aria-pressed="true">Inbox</button>
        <button class="btn btn--ghost btn--sm" type="button" data-chithi-box="archived" aria-pressed="false">Archived</button>
        <button class="btn btn--ghost btn--sm" type="button" data-chithi-refresh>Refresh</button>
      </div>
    </div>
    <p style="font-size:.82rem;color:var(--ink-faint);margin-bottom:1rem">
      Private letters sent from the Chithi page. These are never published and are visible
      only on this screen — no part of the public site can read them.
    </p>
    <div class="rows" data-chithi-rows><p class="empty">Loading…</p></div>
  </div>`;
}

/** A WhatsApp deep link needs digits only, with the country code in front. */
function whatsappLink(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 6) return '';
  // 01XXXXXXXXX is how a Bangladeshi number is written and stored locally;
  // wa.me needs it in international form.
  const international = digits.startsWith('880')
    ? digits
    : digits.startsWith('0')
      ? `880${digits.slice(1)}`
      : digits;
  return `https://wa.me/${international}`;
}

function letterCard(letter) {
  const unread = !letter.read_at;
  const place = [letter.upazila, letter.zila].filter(Boolean).join(', ');
  const whatsapp = whatsappLink(letter.whatsapp);

  const contacts = [
    `<a href="mailto:${esc(letter.email)}">${esc(letter.email)}</a>`,
    whatsapp
      ? `<a href="${esc(whatsapp)}" target="_blank" rel="noopener">WhatsApp ${esc(letter.whatsapp)}</a>`
      : '',
    place ? `<span>${esc(place)}</span>` : ''
  ]
    .filter(Boolean)
    .join('<span aria-hidden="true"> · </span>');

  return `<article class="note-card${unread ? ' note-card--unread' : ''}">
    <div class="note-card__head">
      <div>
        <strong>${esc(letter.name)}</strong>
        <div style="font-size:.72rem;color:var(--ink-faint)">
          ${esc(timeAgo(letter.created_at))} · ${esc(formatDateTime(letter.created_at))}
        </div>
      </div>
      <span class="tag ${unread ? 'tag--draft' : 'tag--live'}" style="margin-left:auto">
        ${unread ? 'Unread' : 'Read'}
      </span>
    </div>
    <div class="note-card__contacts">${contacts}</div>
    <p class="note-card__letter">${esc(letter.message)}</p>
    <div class="row__actions" style="justify-content:flex-start">
      <button class="btn ${unread ? 'btn--primary' : 'btn--ghost'} btn--sm" type="button"
        data-chithi-read="${letter.id}" data-read="${unread ? 0 : 1}">
        ${unread ? 'Mark read' : 'Mark unread'}
      </button>
      <button class="btn btn--ghost btn--sm" type="button"
        data-chithi-archive="${letter.id}" data-archived="${letter.archived ? 1 : 0}">
        ${letter.archived ? 'Move to inbox' : 'Archive'}
      </button>
      <button class="btn btn--danger btn--sm" type="button" data-chithi-delete="${letter.id}">Delete</button>
    </div>
  </article>`;
}

export function initChithi(root, { onChange = () => {} } = {}) {
  const rows = $('[data-chithi-rows]', root);
  let archived = false;

  async function load() {
    try {
      const data = await adminApi.listChithi(archived);
      rows.innerHTML = data.messages.length
        ? data.messages.map(letterCard).join('')
        : `<p class="empty">${archived ? 'Nothing archived yet.' : 'No letters yet.'}</p>`;
    } catch (error) {
      rows.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    }
  }

  for (const button of root.querySelectorAll('[data-chithi-box]')) {
    button.addEventListener('click', () => {
      archived = button.dataset.chithiBox === 'archived';
      for (const other of root.querySelectorAll('[data-chithi-box]')) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      load();
    });
  }

  $('[data-chithi-refresh]', root).addEventListener('click', load);

  rows.addEventListener('click', async (event) => {
    const read = event.target.closest('[data-chithi-read]');
    const archive = event.target.closest('[data-chithi-archive]');
    const remove = event.target.closest('[data-chithi-delete]');

    try {
      if (read) {
        await adminApi.updateChithi(read.dataset.chithiRead, { read: read.dataset.read !== '1' });
      } else if (archive) {
        await adminApi.updateChithi(archive.dataset.chithiArchive, {
          archived: archive.dataset.archived !== '1'
        });
        toast(archive.dataset.archived === '1' ? 'Back in the inbox.' : 'Archived.');
      } else if (remove) {
        // There is no copy of this anywhere else, so say so before it goes.
        if (!confirmAction('Delete this letter permanently? It cannot be recovered.')) return;
        await adminApi.deleteChithi(remove.dataset.chithiDelete);
        toast('Letter deleted.');
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
