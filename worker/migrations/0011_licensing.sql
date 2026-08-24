-- Per-item rights, set from the dashboard.
--
-- Almost everything published here is Musfiq R. Farhan's own work, and saying
-- so in the page markup is what makes a search engine treat this site as the
-- source. But a press photograph or a poster from a production company is
-- published with permission, not owned, and claiming a licence over one of
-- those would be a false statement made at scale.
--
-- So it becomes an editorial decision: the "Original work" switch on the
-- composer and on the gallery form. Existing rows default to 1 because that
-- is what the terms of service have said about them all along — the editor
-- unticks anything that turns out to be someone else's.

ALTER TABLE content ADD COLUMN licensed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE gallery ADD COLUMN licensed INTEGER NOT NULL DEFAULT 1;
