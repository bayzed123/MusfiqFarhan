(() => {
  const taxonomy = [
    ['Premium', ['Popular', 'Eid Special']],
    ['Gallery', ['Portraits', 'Posters', 'Behind the Scenes', 'Wallpapers']],
    ['Poster Release', ['Recent Releases', 'Eid Special']],
    ['Behind the Scenes', ['Studio Notes', 'Making Of']],
    ['New Teaser', ['Recent Releases']],
    ['New Natok', ['Natok & Telefilm', 'Eid Special']],
    ['Short Clips', ['Natok & Telefilm']],
    ['Blog', ['Recent Releases', 'Biography & Journey']],
    ['Press', ['Recent Releases']],
    ['Lifestyle & Fashion', ['Fashion', 'Portraits']],
    ['Wallpapers', ['Portraits', 'Archive']],
    ['Biography & Journey', ['Biography', 'Career Journey']],
    ['Natok & Telefilm', ['New Natok', 'Short Clips']],
    ['Recent Releases', ['Popular', 'Eid Special']],
    ['Popular', ['Eid Special', 'Recent Releases']],
    ['Eid Special', ['Recent Releases', 'Popular']]
  ];
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get('category') || '';
  const activeSubcategory = params.get('subcategory') || '';
  const href = (category, subcategory = '') => `category.html?category=${encodeURIComponent(category)}${subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : ''}`;
  const esc = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const render = (root) => {
    root.innerHTML = `<section class="category-directory-shell" aria-labelledby="category-directory-title"><div class="category-directory-intro"><p class="eyebrow">Explore the archive</p><h2 id="category-directory-title">Every room.<br><em>Every story.</em></h2><p>Browse the official archive by category or open a focused subcategory.</p></div><nav class="category-directory" aria-label="Categories and subcategories">${taxonomy.map(([category, subs]) => `<div class="category-room${activeCategory === category ? ' is-active' : ''}"><a class="category-room-link" href="${href(category)}"${activeCategory === category && !activeSubcategory ? ' aria-current="page"' : ''}>${esc(category)}</a>${subs.length ? `<div class="subcategory-links">${subs.map(sub => `<a href="${href(category, sub)}"${activeCategory === category && activeSubcategory === sub ? ' aria-current="page"' : ''}>${esc(sub)}</a>`).join('')}</div>` : ''}</div>`).join('')}</nav></section>`;
  };
  document.querySelectorAll('[data-category-directory]').forEach(render);
})();
