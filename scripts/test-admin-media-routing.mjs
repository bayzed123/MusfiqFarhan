import assert from 'node:assert/strict';
import fs from 'node:fs';

const composer = fs.readFileSync(new URL('../assets/js/admin/composer.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../worker/migrations/0001_initial.sql', import.meta.url), 'utf8');

assert.match(composer, /if \(!id && values\.type === 'gallery'\)/);
assert.match(composer, /adminApi\.createGalleryItem\(/);
assert.match(composer, /image_url: values\.image/);
assert.match(composer, /alt_text: values\.description \|\| values\.title/);
assert.match(composer, /fillComposer\(root, null\)/);
assert.match(schema, /type TEXT NOT NULL CHECK \(type IN \('video','post','featured'\)\)/);
console.log('Admin gallery pipeline routing checks passed.');
