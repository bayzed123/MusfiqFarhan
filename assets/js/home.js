/**
 * Homepage controller.
 *
 * The page ships pre-rendered by the static build, so this refreshes it with
 * live data (a publish from the dashboard shows up without waiting for a
 * rebuild) and then wires the rails up.
 */

import { api } from './api.js';
import { SITE } from './config.js';
import { $, attr, esc, formatDate, mediaUrl, render, starMarkup } from './dom.js';
import { cardMarkup, initRails, railMarkup } from './cards.js';
import { initRatings } from './rating.js';

function heroMarkup(item) {
  if (!item) return '';
  const image = mediaUrl(item.image || item.og_image, SITE.fallbackImage);
  const href = item.path || '/';
  const watchable = item.type === 'video' || String(item.media_type || '').includes('video');

  return `<div class="hero__media">
      <img src="${attr(image)}" alt="" width="1920" height="1080" fetchpriority="high" decoding="async">
    </div>
    <div class="hero__inner">
      <p class="hero__eyebrow">${esc(item.subcategory || item.category || 'Now showing')}</p>
      <h1>${esc(item.title)}${
        item.year ? `<em>${esc(item.year)}</em>` : ''
      }</h1>
      <div class="hero__meta">
        ${item.published_at ? `<time datetime="${attr(item.published_at)}">${esc(formatDate(item.published_at))}</time>` : ''}
        ${item.rating ? starMarkup(item.rating) : ''}
        <span>${esc(item.category || '')}</span>
      </div>
      ${item.description ? `<p class="hero__lede">${esc(item.description)}</p>` : ''}
        <div class="hero__actions">
          <a class="button button--primary" href="${attr(href)}">${watchable ? '▶ Watch now' : 'Read the story'}</a>
          <a class="button button--ghost" href="/c/recent-releases/">Browse recent releases</a>
        </div>
        <div class="hero__official" aria-label="Official profiles and professional references">
          <div class="hero__official-heading">
            <span class="hero__official-rule" aria-hidden="true"></span>
            <span>Official profiles</span>
            <span class="hero__verified" title="Profile link verified by the official site"><span aria-hidden="true">✓</span> Verified links</span>
          </div>
          <div class="hero__official-links">
            <a href="https://www.instagram.com/musfiqfarhan?igsh=MWxxeWI3aTkzbHM5cQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram official profile"><img src="/assets/img/social-instagram.png" alt="" width="24" height="24"> <span>Instagram</span></a>
            <a href="https://www.imdb.com/name/nm11068428/bio/" target="_blank" rel="noopener noreferrer" aria-label="IMDb profile"><img src="/assets/img/social-imdb.png" alt="" width="34" height="20"> <span>IMDb</span></a>
            <a href="https://youtube.com/@musfiqrfarhan?si=gG4wQxD6qsIpVZCZ" target="_blank" rel="noopener noreferrer" aria-label="YouTube official channel"><img src="/assets/img/social-youtube.png" alt="" width="28" height="20"> <span>YouTube</span></a>
            <a href="https://whatsapp.com/channel/0029VbBdG03HQbS1bTrVHF1X" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp official channel"><img src="/assets/img/social-whatsapp.png" alt="" width="24" height="24"> <span>WhatsApp</span></a>
            <a href="https://www.crunchbase.com/person/musfiq-r-farhan" target="_blank" rel="noopener noreferrer" aria-label="Crunchbase profile"><img src="/assets/img/social-crunchbase.png" alt="" width="24" height="24"> <span>Crunchbase</span></a>
            <a href="https://www.linkedin.com/in/musfiqrfarhanofficial" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn official profile"><img src="/assets/img/social-linkedin.png" alt="" width="24" height="24"> <span>LinkedIn</span></a>
            <a href="https://x.com/musfiqrofficial" target="_blank" rel="noopener noreferrer" aria-label="X official profile"><img src="/assets/img/social-x.png" alt="" width="24" height="24"> <span>X</span></a>
          </div>
          <p class="hero__official-note">Public identity references for Musfiq R. Farhan, Bangladeshi actor and storyteller.</p>
        </div>
      </div>`;
}

function posterStripMarkup(items) {
  if (!items?.length) return '';
  return `<div class="section__head">
      <div>
        <h2 class="section__title" id="posters-title">Poster release</h2>
        <p class="section__blurb">First-look posters, straight after the banner.</p>
      </div>
      <a class="section__link" href="/c/poster-release/">See all posters →</a>
    </div>
    <div class="rail rail--posters" data-rail>
      <button class="rail__arrow rail__arrow--prev" type="button" data-rail-prev aria-label="Scroll posters left">‹</button>
      <div class="rail__track" data-rail-track tabindex="0" role="group" aria-label="Poster releases">
        ${items.map((item) => cardMarkup(item, { variant: 'poster' })).join('')}
      </div>
      <button class="rail__arrow rail__arrow--next" type="button" data-rail-next aria-label="Scroll posters right">›</button>
    </div>`;
}

export async function initHome() {
  let data;
  try {
    data = await api.home();
  } catch {
    // Keep whatever the static build rendered rather than blanking the page.
    initRails();
    return;
  }

  if (data.featured) render('[data-hero]', heroMarkup(data.featured));

  const posterSection = $('[data-posters]');
  if (posterSection) {
    const markup = posterStripMarkup(data.posters);
    if (markup) posterSection.innerHTML = markup;
    else posterSection.remove();
  }

  const railsHost = $('[data-rails]');
  if (railsHost) {
    railsHost.innerHTML = (data.rails || [])
      // Posters already have their own strip directly under the hero.
      .filter((rail) => rail.category !== 'Poster Release')
      .map((rail) =>
        railMarkup({
          id: `rail-${rail.slug}`,
          title: rail.category,
          href: `/c/${rail.slug}/`,
          items: rail.items,
          variant: ['Gallery', 'Wallpapers', 'Poster Release', 'Lifestyle & Fashion'].includes(rail.category)
            ? 'poster'
            : 'wide'
        })
      )
      .join('');
  }

  initRails();
  initRatings();
}

initHome();
