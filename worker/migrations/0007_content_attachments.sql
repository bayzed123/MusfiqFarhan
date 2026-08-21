ALTER TABLE content ADD COLUMN attachment_url TEXT;
CREATE INDEX IF NOT EXISTS idx_content_attachment ON content(attachment_url);
