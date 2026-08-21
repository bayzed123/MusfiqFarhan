PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('video','post','featured')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image TEXT,
  video_url TEXT,
  category TEXT,
  year TEXT,
  description TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_type_published ON content(type, published, updated_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved, created_at DESC);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  public_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings(key, value) VALUES
  ('site_name', 'Musfiq R. Farhan Official'),
  ('site_description', 'The official website of Musfiq R. Farhan, Bangladeshi actor, radio jockey and content creator.'),
  ('profile_name', 'Musfiq R. Farhan'),
  ('profile_role', 'Actor · Storyteller · Bangladesh');

INSERT OR IGNORE INTO content(type, title, slug, image, video_url, category, year, description, published) VALUES
  ('featured', 'Doob', 'doob', '/assets/doob-poster.jpg', NULL, 'Latest release', '2026', 'A new story is taking shape. Discover the latest project, its collaborators and the feeling behind the frame.', 1),
  ('video', 'Eta Golpo Noi | Dear Valentine', 'eta-golpo-noi-dear-valentine', 'https://i.ytimg.com/vi/t8d6rWQQl8g/hqdefault.jpg', 'https://www.youtube.com/watch?v=t8d6rWQQl8g', 'Natok Song', '2023', 'Official video archive.', 1),
  ('video', 'Boro Beshi Valobashi | Couple Goals', 'boro-beshi-valobashi', 'https://i.ytimg.com/vi/A4JyJV426AI/hqdefault.jpg', 'https://www.youtube.com/watch?v=A4JyJV426AI', 'Natok Song', '2020', 'Official video archive.', 1),
  ('video', 'Shondha Namay Rakhi | Sad Version', 'shondha-namay-rakhi', 'https://i.ytimg.com/vi/TQuUWD1dzDg/hqdefault.jpg', 'https://www.youtube.com/watch?v=TQuUWD1dzDg', 'Music Video', '2019', 'Official video archive.', 1),
  ('video', 'Shondhya Namaye Rakhi | Tui Firbi Bole', 'shondhya-namaye-rakhi', 'https://i.ytimg.com/vi/xp-zTZoYfKg/hqdefault.jpg', 'https://www.youtube.com/watch?v=xp-zTZoYfKg', 'Music Video', '2019', 'Official video archive.', 1),
  ('post', 'Doob: A new story is taking shape', 'doob-new-story', '/assets/doob-poster.jpg', NULL, 'Newsroom', '2026-05-21', 'A first look at the next chapter, the collaborators and the feeling behind the frame.', 1),
  ('post', 'Tor Preme Pagol', 'tor-preme-pagol', '/assets/hero-portrait.png', NULL, 'Release', '2026-05-14', 'A romantic natok story with a world of its own. Explore the latest release notes.', 1),
  ('post', 'Behind the scene', 'behind-the-scene', '/assets/musfiq-profile-1.jpg', NULL, 'Studio notes', '2026-04-28', 'The quiet moments, the energy between takes and the people who make the work possible.', 1);
