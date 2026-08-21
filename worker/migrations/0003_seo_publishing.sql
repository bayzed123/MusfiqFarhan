ALTER TABLE content ADD COLUMN seo_title TEXT;
ALTER TABLE content ADD COLUMN meta_description TEXT;
ALTER TABLE content ADD COLUMN keywords TEXT;
ALTER TABLE content ADD COLUMN author_name TEXT NOT NULL DEFAULT 'Musfiq R. Farhan';
ALTER TABLE content ADD COLUMN canonical_url TEXT;
ALTER TABLE content ADD COLUMN og_image TEXT;
ALTER TABLE content ADD COLUMN body TEXT;
ALTER TABLE content ADD COLUMN published_at TEXT;
ALTER TABLE content ADD COLUMN modified_at TEXT;
ALTER TABLE content ADD COLUMN duration TEXT;
ALTER TABLE content ADD COLUMN embed_url TEXT;
ALTER TABLE content ADD COLUMN thumbnail_url TEXT;
ALTER TABLE content ADD COLUMN indexable INTEGER NOT NULL DEFAULT 1;

UPDATE content SET
  seo_title = COALESCE(seo_title, title || ' | Musfiq R. Farhan Official'),
  meta_description = COALESCE(meta_description, COALESCE(description, 'Official Musfiq R. Farhan content from the studio archive.')),
  canonical_url = COALESCE(canonical_url, CASE WHEN type='post' THEN 'https://www.musfiqrfarhan.blog/post.html?slug=' || slug WHEN type='video' THEN 'https://www.musfiqrfarhan.blog/watch.html?slug=' || slug ELSE 'https://www.musfiqrfarhan.blog/' END),
  og_image = COALESCE(og_image, image),
  published_at = COALESCE(published_at, created_at),
  modified_at = COALESCE(modified_at, updated_at),
  thumbnail_url = COALESCE(thumbnail_url, image),
  category = COALESCE(NULLIF(category, ''), 'Official archive')
WHERE seo_title IS NULL OR meta_description IS NULL OR canonical_url IS NULL OR published_at IS NULL;
