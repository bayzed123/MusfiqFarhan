-- Where a piece of media came from, and therefore whose rights it carries.
--
-- Two things get published here. A file uploaded from the phone is served
-- from this site's own storage and is Musfiq R. Farhan's own work. A link
-- pasted from YouTube or Facebook is someone else's upload, embedded here
-- because he acts in it — the rights stay with the uploader.
--
-- The URL already knows which is which, so this column holds a preference
-- rather than an answer: 'auto' (read the media and decide, the default),
-- 'own' (force the site's own licence), 'shared' (force attribution only).
-- See shared/rights.js for the rule it feeds.

ALTER TABLE content ADD COLUMN rights_mode TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE gallery ADD COLUMN rights_mode TEXT NOT NULL DEFAULT 'auto';
