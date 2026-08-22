import assert from 'node:assert/strict';
import fs from 'node:fs';

const form = fs.readFileSync(new URL('../love-notes/index.html', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../assets/js/love-notes.js', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../assets/js/api.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
const media = fs.readFileSync(new URL('../worker/src/lib/media.js', import.meta.url), 'utf8');

assert.match(form, /name="name"[^>]*placeholder="Enter your name"/);
assert.match(form, /name="city"[^>]*placeholder="City \(optional\)"/);
assert.doesNotMatch(form, /placeholder="Nusrat"|placeholder="Dhaka"/);
assert.match(form, /name="avatar_file"[^>]*type="file"/);
assert.match(form, /accept="image\/jpeg,image\/png,image\/webp"/);
assert.match(client, /api\.uploadLoveNoteAvatar\(avatarFile\)/);
assert.match(api, /\/api\/public\/love-notes\/avatar/);
assert.match(worker, /path === '\/api\/public\/love-notes\/avatar' && method === 'POST'/);
assert.match(media, /LOVE_NOTE_AVATAR_LIMIT = 5 \* 1024 \* 1024/);
assert.match(media, /image\/jpeg.*image\/png.*image\/webp/s);
console.log('Love Notes form and avatar-upload checks passed.');
