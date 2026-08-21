UPDATE content SET published_at = CASE
  WHEN length(year) = 10 THEN year || 'T00:00:00+06:00'
  WHEN length(year) = 4 THEN year || '-01-01T00:00:00+06:00'
  ELSE published_at
END,
modified_at = CASE
  WHEN length(year) = 10 THEN year || 'T00:00:00+06:00'
  WHEN length(year) = 4 THEN year || '-01-01T00:00:00+06:00'
  ELSE modified_at
END
WHERE id <= 8 AND year IS NOT NULL;
