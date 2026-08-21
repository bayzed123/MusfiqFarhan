CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Portraits',
  caption TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_published_order ON gallery(published, sort_order, updated_at DESC);

INSERT OR IGNORE INTO gallery(title, slug, image_url, alt_text, category, caption, published, sort_order) VALUES
  ('In character', 'in-character', '/assets/musfiq-profile-1.jpg', 'Musfiq R. Farhan portrait in character', 'Portraits', 'In character', 1, 1),
  ('Between takes', 'between-takes', '/assets/about_photo.png', 'Musfiq R. Farhan studio portrait between takes', 'Behind the scenes', 'Between takes', 1, 2),
  ('New chapter', 'new-chapter', '/assets/doob-poster.jpg', 'Doob project poster', 'Posters', 'New chapter', 1, 3),
  ('Portrait / MRF', 'portrait-mrf', '/assets/hero-portrait.png', 'Portrait of Musfiq R. Farhan', 'Portraits', 'Portrait / MRF', 1, 4),
  ('The journey', 'the-journey', '/assets/profile_1.jpg', 'Musfiq R. Farhan portrait from the official archive', 'Archive', 'The journey', 1, 5);
