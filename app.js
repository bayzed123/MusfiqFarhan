(() => {
  const API = (window.MRF_API_URL || '').replace(/\/$/, '');
  const fallbackVideos = [
    { title: 'Eta Golpo Noi | Dear Valentine', category: 'Natok Song', image: 'https://i.ytimg.com/vi/t8d6rWQQl8g/hqdefault.jpg', video_url: 'https://www.youtube.com/watch?v=t8d6rWQQl8g', year: '2023' },
    { title: 'Boro Beshi Valobashi | Couple Goals', category: 'Natok Song', image: 'https://i.ytimg.com/vi/A4JyJV426AI/hqdefault.jpg', video_url: 'https://www.youtube.com/watch?v=A4JyJV426AI', year: '2020' },
    { title: 'Shondha Namay Rakhi | Sad Version', category: 'Music Video', image: 'https://i.ytimg.com/vi/TQuUWD1dzDg/hqdefault.jpg', video_url: 'https://www.youtube.com/watch?v=TQuUWD1dzDg', year: '2019' },
    { title: 'Shondhya Namaye Rakhi | Tui Firbi Bole', category: 'Music Video', image: 'https://i.ytimg.com/vi/xp-zTZoYfKg/hqdefault.jpg', video_url: 'https://www.youtube.com/watch?v=xp-zTZoYfKg', year: '2019' }
  ];
  const fallbackPosts = [
    { title: 'Doob: A new story is taking shape', excerpt: 'A first look at the next chapter, the collaborators and the feeling behind the frame.', date: '2026-05-21', category: 'Newsroom' },
    { title: 'Tor Preme Pagol', excerpt: 'A romantic natok story with a world of its own. Explore the latest release notes.', date: '2026-05-14', category: 'Release' },
    { title: 'Behind the scene', excerpt: 'The quiet moments, the energy between takes and the people who make the work possible.', date: '2026-04-28', category: 'Studio notes' }
  ];
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const formatDate = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date); };
  const youtubeId = (url = '') => { const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/); return match ? match[1] : ''; };
  const fetchJson = async (path, options) => { if (!API) throw new Error('API not configured'); const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options && options.headers) } }); if (!response.ok) throw new Error(`API ${response.status}`); return response.json(); };

  function renderVideos(videos) {
    const grid = $('video-grid'); if (!grid) return;
    grid.innerHTML = videos.slice(0, 8).map((video) => `<article class="content-card" data-video="${escapeHtml(video.video_url || video.url || '')}" tabindex="0"><img loading="lazy" src="${escapeHtml(video.image || `https://i.ytimg.com/vi/${youtubeId(video.video_url || video.url || '')}/hqdefault.jpg`)}" alt="${escapeHtml(video.title)} poster"><span class="play-circle">▶</span><div class="content-card-body"><span class="card-tag">${escapeHtml(video.category || video.tag || 'Watch')}</span><h3>${escapeHtml(video.title)}</h3><span class="card-meta">${escapeHtml(video.year || video.date || 'Official archive')}</span></div></article>`).join('');
    grid.querySelectorAll('[data-video]').forEach((card) => { card.addEventListener('click', () => openVideo(card.dataset.video)); card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') openVideo(card.dataset.video); }); });
  }
  function renderPosts(posts) { const grid = $('journal-grid'); if (!grid) return; grid.innerHTML = posts.slice(0, 6).map((post) => `<article class="journal-card"><time>${escapeHtml(formatDate(post.date || post.published_at))}</time><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt || post.summary || '')}</p>${post.url ? `<a href="${escapeHtml(post.url)}" target="_blank" rel="noopener">Read note ↗</a>` : '<a href="#contact">More soon ↗</a>'}</article>`).join(''); }
  function renderFeatured(item) { if (!item) return; if ($('featured-name')) $('featured-name').textContent = item.title || 'The latest chapter'; if ($('featured-description')) $('featured-description').textContent = item.description || item.excerpt || 'A new story is taking shape. Discover the latest project, its collaborators and the feeling behind the frame.'; if ($('featured-image') && item.image) { $('featured-image').src = item.image; $('featured-image').alt = `${item.title || 'Featured'} project poster`; } if ($('featured-type')) $('featured-type').textContent = item.category || item.tag || 'Latest release'; if ($('featured-meta')) $('featured-meta').textContent = `${item.cast ? item.cast.join(' · ') : 'Musfiq R. Farhan'} · ${item.year || item.date || 'Bangladesh'}`; if ($('featured-open') && item.video_url) $('featured-open').onclick = () => openVideo(item.video_url); }
  function renderReviews(data) { const reviews = Array.isArray(data.reviews) ? data.reviews : []; const average = Number(data.average || 0); if ($('rating-average')) $('rating-average').textContent = average ? average.toFixed(1) : '—'; if ($('rating-count')) $('rating-count').textContent = `${data.count || reviews.length || 0} audience notes`; const list = $('reviews-list'); if (!list) return; list.innerHTML = reviews.length ? reviews.slice(0, 6).map((review) => `<article class="review-card"><span class="stars">${'★'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)))}${'☆'.repeat(Math.max(0, 5 - (Number(review.rating) || 5)))}</span><p>${escapeHtml(review.body)}</p><strong>${escapeHtml(review.name)}</strong></article>`).join('') : '<p class="muted">Your words could be the next story here.</p>'; }
  function openVideo(url) { const id = youtubeId(url); if (!id) { if (url) window.open(url, '_blank', 'noopener'); return; } const modal = $('video-modal'); const frame = $('video-frame'); frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeVideo() { const modal = $('video-modal'); if (!modal) return; $('video-frame').src = ''; modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  async function loadContent() {
    renderVideos(fallbackVideos); renderPosts(fallbackPosts);
    try { const data = await fetchJson('/api/public/home'); if (data.videos?.length) renderVideos(data.videos); if (data.posts?.length) renderPosts(data.posts); if (data.featured) renderFeatured(data.featured); } catch (error) { console.info('Using curated fallback content until MRF-API is available.'); }
    try { renderReviews(await fetchJson('/api/public/reviews')); } catch (error) { renderReviews({ reviews: [], count: 0, average: 0 }); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('year').textContent = new Date().getFullYear();
    $('modal-close')?.addEventListener('click', closeVideo); $('video-modal')?.addEventListener('click', (event) => { if (event.target.id === 'video-modal') closeVideo(); }); document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeVideo(); });
    $('review-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const status = $('review-status'); const form = new FormData(event.currentTarget); const payload = { name: form.get('name'), rating: Number(form.get('rating')), body: form.get('body') }; status.textContent = 'Sending your note…'; try { await fetchJson('/api/public/reviews', { method: 'POST', body: JSON.stringify(payload) }); event.currentTarget.reset(); status.textContent = 'Thank you. Your note is waiting for approval.'; } catch (error) { status.textContent = 'The studio is offline for a moment. Please try again soon.'; } });
    const header = $('site-header'); window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 24), { passive: true }); const menu = document.querySelector('.menu-toggle'); const nav = document.querySelector('.primary-nav'); menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); }); nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => nav.classList.remove('open'))); loadContent();
  });
})();
