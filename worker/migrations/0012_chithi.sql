-- Chithi — private letters to Musfiq.
--
-- Deliberately not a second love_notes. A love note is written to be read by
-- everyone: it carries `approved`, runs in the sitewide ticker and lands on
-- the fan wall. A chithi is written to be read by one person. There is no
-- `approved` column here and there never should be, because there is no
-- state in which one of these is published — the absence of the column is
-- what makes "publish it" impossible to do by accident.
--
-- It holds contact details a love note never does (email, WhatsApp, district),
-- which is the other reason it lives in its own table: the public export
-- selects from love_notes by name, so a private message cannot be swept into
-- the static build by a query that forgot to filter.
CREATE TABLE IF NOT EXISTS chithi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  zila TEXT NOT NULL DEFAULT '',
  upazila TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  -- When it arrived. Shown against every message in the dashboard.
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Null until it is opened, so the nav badge can count what is waiting.
  read_at TEXT,
  archived INTEGER NOT NULL DEFAULT 0
);

-- The inbox is read newest-first, and the badge counts the unread.
CREATE INDEX IF NOT EXISTS idx_chithi_inbox ON chithi(archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chithi_unread ON chithi(read_at);
