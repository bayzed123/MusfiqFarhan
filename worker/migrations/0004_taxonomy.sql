ALTER TABLE content ADD COLUMN subcategory TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_content_taxonomy ON content(category, subcategory, published, updated_at DESC);

UPDATE content SET category='Poster Release', subcategory='Recent Releases' WHERE type='featured' AND title='Doob';
UPDATE content SET category='Natok & Telefilm', subcategory='New Natok' WHERE type='video' AND category='Natok Song';
UPDATE content SET category='Natok & Telefilm', subcategory='Short Clips' WHERE type='video' AND category='Music Video';
UPDATE content SET category='Blog', subcategory='Recent Releases' WHERE type='post' AND category='Newsroom';
UPDATE content SET category='Blog', subcategory='Biography & Journey' WHERE type='post' AND category='Release';
UPDATE content SET category='Behind the Scenes', subcategory='Behind the Scenes' WHERE type='post' AND category='Studio notes';
