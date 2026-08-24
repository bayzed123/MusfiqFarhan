/**
 * Share this post.
 *
 * A button on every item page opens a sheet of the places people actually
 * send links, each one a real share endpoint carrying this page's canonical
 * URL and title — so what lands in the chat is the permanent link, not
 * whatever tracking-laden address happened to be in the address bar.
 *
 * The host element is written by the build as `<div class="share" data-share>`
 * so the markup is in the page source; this fills it in.
 */

import { $, $$, attr, canonicalUrl, esc, on } from './dom.js';

function pageTitle() {
  const heading = document.querySelector('[data-entry-title]')?.textContent?.trim();
  return heading || document.title.replace(/\s*\|.*$/, '').trim();
}

function pageImage() {
  return document.querySelector('meta[property="og:image"]')?.content || '';
}

const ICONS = {
  facebook:
    '<path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z"/>',
  whatsapp:
    '<path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.1 14c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.5-.6a11 11 0 0 1-4.2-4c-.3-.5-.7-1.2-.7-2 0-.7.4-1.2.6-1.4.2-.2.4-.3.6-.3h.5c.1 0 .3 0 .5.4l.7 1.6c.1.1.1.3 0 .5l-.3.4-.3.3c-.1.1-.2.2-.1.4.2.3.7 1.1 1.4 1.7.9.8 1.6 1 1.9 1.2.2.1.4 0 .5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.2.1.6-.1 1.1z"/>',
  x: '<path d="M17.5 3h3l-6.6 7.5L21.7 21h-6l-4.7-6.1L5.6 21h-3l7-8L2.6 3h6.2l4.2 5.6L17.5 3zm-1 16h1.7L7.6 4.8H5.8L16.5 19z"/>',
  telegram:
    '<path d="M21.5 4.3 2.9 11.4c-.9.4-.9 1.1 0 1.3l4.7 1.5 1.8 5.5c.2.6.4.8 1 .8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.4c.3-1.3-.5-1.9-1.6-1.8zM8.9 14.1 17.9 8c.4-.3.8-.1.5.2l-7.5 6.8-.3 3.1-1.7-4z"/>',
  linkedin:
    '<path d="M6.9 8H4v12h2.9V8zM5.4 3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20 13.4c0-3.2-1.7-4.7-4-4.7-1.8 0-2.6 1-3.1 1.7V8H10v12h2.9v-6.7c0-1.4.9-2.1 1.9-2.1s1.7.6 1.7 2.1V20H20v-6.6z"/>',
  reddit:
    '<path d="M22 12a2 2 0 0 0-3.4-1.4 10 10 0 0 0-5-1.4l.9-4 2.8.6a1.7 1.7 0 1 0 .2-1.4l-3.5-.8a.7.7 0 0 0-.8.5l-1.1 5.1a10 10 0 0 0-5 1.4A2 2 0 1 0 4 14.8a4 4 0 0 0 0 .6c0 3 3.6 5.4 8 5.4s8-2.4 8-5.4a4 4 0 0 0 0-.6c.6-.4 1-1 1-1.8zM8 14a1.4 1.4 0 1 1 2.8 0A1.4 1.4 0 0 1 8 14zm7.9 4a5.7 5.7 0 0 1-3.9 1.1A5.7 5.7 0 0 1 8.1 18a.5.5 0 0 1 .7-.7 4.8 4.8 0 0 0 3.2.9 4.8 4.8 0 0 0 3.2-.9.5.5 0 0 1 .7.7zm-.3-2.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8z"/>',
  pinterest:
    '<path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.43 7.63 11.17-.11-.95-.2-2.4.04-3.44.22-.94 1.4-5.96 1.4-5.96s-.36-.72-.36-1.78c0-1.67.97-2.92 2.17-2.92 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.19.6 2.16 1.78 2.16 2.13 0 3.77-2.25 3.77-5.49 0-2.87-2.06-4.88-5.01-4.88-3.41 0-5.42 2.56-5.42 5.2 0 1.04.4 2.14.9 2.74a.36.36 0 0 1 .08.35l-.34 1.36c-.05.22-.17.27-.4.16-1.5-.7-2.43-2.89-2.43-4.65 0-3.79 2.75-7.27 7.93-7.27 4.16 0 7.4 2.97 7.4 6.93 0 4.14-2.61 7.47-6.23 7.47-1.21 0-2.36-.64-2.75-1.38l-.75 2.85c-.27 1.05-1 2.35-1.49 3.15 1.12.35 2.31.53 3.55.53 6.63 0 12-5.37 12-12S18.63 0 12 0z"/>',
  email:
    '<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.2-8 5-8-5V6l8 5 8-5v2.2z"/>',
  link: '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 1.4l-1.4 1.4a1 1 0 0 1-1.4 0zM7.8 16.2a4 4 0 0 1 0-5.7l2.1-2.1a1 1 0 0 1 1.4 1.4l-2.1 2.1a2 2 0 0 0 2.8 2.8l2.1-2.1a1 1 0 0 1 1.4 1.4l-2.1 2.1a4 4 0 0 1-5.6 0zm8.4-8.4a4 4 0 0 1 0 5.7l-2.1 2.1a1 1 0 0 1-1.4-1.4l2.1-2.1a2 2 0 0 0-2.8-2.8L9.9 11.4A1 1 0 0 1 8.5 10l2.1-2.1a4 4 0 0 1 5.6 0z"/>',
  share:
    '<path d="M18 16.1c-.8 0-1.5.3-2 .8l-7-4a3 3 0 0 0 0-1.8l7-4a3 3 0 1 0-1-2.2c0 .3 0 .6.1.9l-7 4a3 3 0 1 0 0 4.4l7 4c0 .3-.1.5-.1.8a3 3 0 1 0 3-2.9z"/>'
};

const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">${ICONS[name]}</svg>`;

/**
 * Every destination is a documented share endpoint that takes the URL as a
 * parameter, so the link that arrives is this page's canonical URL.
 */
function destinations({ url, title, image }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://api.whatsapp.com/send?text=${t}%20${u}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`
    },
    { id: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    {
      id: 'pinterest',
      label: 'Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}${
        image ? `&media=${encodeURIComponent(image)}` : ''
      }`
    },
    { id: 'email', label: 'Email', href: `mailto:?subject=${t}&body=${t}%20${u}` }
  ];
}

function sheetMarkup(share) {
  const links = destinations(share)
    .map(
      (item) => `<a class="share-sheet__item" href="${attr(item.href)}"
        target="_blank" rel="noopener noreferrer" data-share-to="${attr(item.id)}">
        ${icon(item.id)}<span>${esc(item.label)}</span>
      </a>`
    )
    .join('');

  return `<div class="share-sheet" data-share-sheet role="dialog" aria-modal="true"
    aria-label="Share this page">
    <div class="share-sheet__panel">
      <div class="share-sheet__head">
        <h2>Share this</h2>
        <button class="share-sheet__close" type="button" data-share-close aria-label="Close">×</button>
      </div>
      <p class="share-sheet__title">${esc(share.title)}</p>
      <div class="share-sheet__grid">${links}</div>
      <div class="share-sheet__foot">
        <input class="share-sheet__url" type="text" readonly value="${attr(share.url)}"
          aria-label="Link to this page" data-share-url>
        <button class="button button--primary" type="button" data-share-copy>
          ${icon('link')} Copy link
        </button>
      </div>
    </div>
  </div>`;
}

export function openShareSheet(share) {
  const host = document.createElement('div');
  host.innerHTML = sheetMarkup(share);
  const sheet = host.firstElementChild;
  document.body.appendChild(sheet);
  document.body.classList.add('is-sharing');

  const close = () => {
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('is-sharing');
    sheet.remove();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  on(sheet, 'click', async (event) => {
    // The backdrop and the close button both dismiss.
    if (event.target === sheet || event.target.closest('[data-share-close]')) return close();

    if (event.target.closest('[data-share-copy]')) {
      const button = event.target.closest('[data-share-copy]');
      try {
        await navigator.clipboard.writeText(share.url);
        button.textContent = 'Link copied';
      } catch {
        // Clipboard access can be refused; select the text so it can be
        // copied by hand rather than leaving the button doing nothing.
        const field = $('[data-share-url]', sheet);
        field.focus();
        field.select();
        button.textContent = 'Press Ctrl+C';
      }
      return;
    }

    // Any real destination opens in its own tab and the sheet gets out of
    // the way, so coming back lands on the post rather than this overlay.
    if (event.target.closest('[data-share-to]')) close();
  });

  $('[data-share-close]', sheet)?.focus();
}

/**
 * Share one thing — a post, or a single photograph from the gallery.
 *
 * On a phone the built-in sheet reaches apps a web page cannot — Messenger,
 * Instagram, the SMS app — so it is offered first where it exists. Dismissing
 * it is not a failure to recover from, it is a decision, so an AbortError
 * ends here rather than falling through to our own list; any other error
 * means the native sheet never opened, and then our list is the fallback.
 */
export async function shareThis(share) {
  if (navigator.share) {
    try {
      await navigator.share({ title: share.title, url: share.url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  openShareSheet(share);
}

/** The markup for a share button, so every caller gets the same one. */
export function shareButtonHtml(label = 'Share') {
  return `<button class="button button--ghost share__button" type="button" data-share-open>
      ${icon('share')} ${esc(label)}
    </button>`;
}

export function initShare() {
  for (const host of $$('[data-share]')) {
    if (host.dataset.shareReady) continue;
    host.dataset.shareReady = 'true';

    const share = {
      url: host.dataset.shareUrl || canonicalUrl(),
      title: host.dataset.shareTitle || pageTitle(),
      image: pageImage()
    };

    host.innerHTML = shareButtonHtml();

    on(host, 'click', (event) => {
      if (!event.target.closest('[data-share-open]')) return;
      shareThis(share);
    });
  }
}

initShare();
