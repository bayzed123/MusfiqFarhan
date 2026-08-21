ALTER TABLE reviews ADD COLUMN content_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_reviews_content_approved ON reviews(content_slug, approved, created_at DESC);
