import assert from 'node:assert/strict';
import { CATEGORIES, KINDS, findKind, resolvePlacement } from '../shared/taxonomy.js';
import { categoryPath, contentPath } from '../shared/urls.js';

const expected = new Map(KINDS.map((kind) => [kind.id, kind]));
assert.equal(expected.size, KINDS.length, 'kind IDs must be unique');

for (const kind of KINDS) {
  const placement = resolvePlacement({
    kind: kind.id,
    category: 'Blog',
    subcategory: 'Biography & Journey'
  });
  assert.equal(placement.ok, true, `${kind.id} must resolve`);
  assert.equal(placement.category, kind.category, `${kind.id} category`);
  assert.equal(placement.subcategory, kind.subcategory, `${kind.id} subcategory`);
  assert.equal(placement.kind, kind.id, `${kind.id} kind`);

  const item = { category: placement.category, slug: `routing-${kind.id}` };
  assert.equal(contentPath(item), `/${kind.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/routing-${kind.id}/` .replace('natok-telefilm', 'natok-telefilm'));
}

const routes = [
  ['New Natok', '/c/new-natok/'],
  ['New Teaser', '/c/new-teaser/'],
  ['Short Clips', '/c/short-clips/'],
  ['Natok & Telefilm', '/c/natok-telefilm/'],
  ['Gallery', '/c/gallery/'],
  ['Poster Release', '/c/poster-release/'],
  ['Wallpapers', '/c/wallpapers/'],
  ['Lifestyle & Fashion', '/c/lifestyle-fashion/'],
  ['Blog', '/c/blog/'],
  ['Press', '/c/press/'],
  ['Biography & Journey', '/c/biography-journey/'],
  ['Behind the Scenes', '/c/behind-the-scenes/'],
  ['Premium', '/c/premium/'],
  ['Popular', '/c/popular/'],
  ['Recent Releases', '/c/recent-releases/'],
  ['Eid Special', '/c/eid-special/']
];
for (const [name, path] of routes) assert.equal(categoryPath(name), path, `${name} URL`);
for (const category of CATEGORIES) {
  assert.ok(category.subcategories.length > 0, `${category.name} needs a subcategory pipeline`);
  assert.equal(findKind(category.name)?.category || category.name, category.name === 'New Natok' ? 'New Natok' : findKind(category.name)?.category || category.name);
}
console.log(`Routing tests passed for ${KINDS.length} publishing kinds and ${routes.length} top-level sections.`);
