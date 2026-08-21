-- Content management rebuild: kind presets, media typing, ordering,
-- love notes, and a remap of every existing row onto the canonical taxonomy.

ALTER TABLE content ADD COLUMN kind TEXT NOT NULL DEFAULT '';
ALTER TABLE content ADD COLUMN media_type TEXT NOT NULL DEFAULT '';
ALTER TABLE content ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE content ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE content ADD COLUMN path TEXT;

CREATE INDEX IF NOT EXISTS idx_content_kind ON content(kind, published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_path ON content(path);

-- Fan love notes. Deliberately separate from `reviews`: a review rates one
-- page, a love note is a message to Musfiq that runs in the sitewide marquee.
CREATE TABLE IF NOT EXISTS love_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  city TEXT,
  avatar_url TEXT,
  hearts INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_love_notes_approved
  ON love_notes(approved, pinned DESC, created_at DESC);

-- Remap legacy category values onto the published taxonomy so nothing is
-- stranded in a category the navigation no longer renders.
UPDATE content SET category='Poster Release', subcategory='Recent Releases'
  WHERE category IN ('Latest release', 'Release', 'Official archive');
UPDATE content SET category='Blog', subcategory='Recent Releases'
  WHERE category IN ('Newsroom', 'News');
UPDATE content SET category='Behind the Scenes', subcategory='Studio Notes'
  WHERE category IN ('Studio notes', 'Studio Notes');
UPDATE content SET category='Natok & Telefilm', subcategory='New Natok'
  WHERE category IN ('Natok Song', 'Natok');
UPDATE content SET category='Short Clips', subcategory='Natok & Telefilm'
  WHERE category IN ('Music Video', 'Music video');
UPDATE content SET category='Premium', subcategory='Popular'
  WHERE category IS NULL OR TRIM(category) = '';

-- Backfill the kind so the admin composer can group existing rows.
UPDATE content SET kind='featured' WHERE type='featured' AND kind='';
UPDATE content SET kind='full-natok' WHERE type='video' AND category='New Natok' AND kind='';
UPDATE content SET kind='short-video' WHERE type='video' AND category='Short Clips' AND kind='';
UPDATE content SET kind='natok-teaser' WHERE type='video' AND category='New Teaser' AND kind='';
UPDATE content SET kind='behind-the-scenes' WHERE category='Behind the Scenes' AND kind='';
UPDATE content SET kind='biography' WHERE category='Biography & Journey' AND kind='';
UPDATE content SET kind='poster' WHERE category='Poster Release' AND kind='';
UPDATE content SET kind='blog' WHERE type='post' AND kind='';
UPDATE content SET kind='short-video' WHERE type='video' AND kind='';

UPDATE content SET media_type='video' WHERE type='video' AND media_type='';
UPDATE content SET media_type='image' WHERE type IN ('post', 'featured') AND media_type='';

-- Seed a few approved love notes so the marquee is never empty on first load.
INSERT OR IGNORE INTO love_notes(id, name, message, city, approved, pinned) VALUES
  (1, 'Nusrat', 'Every natok feels like it was written for us. Thank you for the stories.', 'Dhaka', 1, 1),
  (2, 'Rafiul', 'Watched Tor Preme Pagol three times with my family. Pure joy.', 'Chattogram', 1, 0),
  (3, 'Sadia', 'From radio to screen — we have been here the whole way.', 'Sylhet', 1, 0);
