-- Ensure Request ID is unique so re-imports upsert instead of duplicating.
-- Safe to re-run: skips adding the index if it already exists.
--
-- If this fails with duplicate key errors, clean duplicates first, e.g.:
--   DELETE t1 FROM itsm_requests t1
--   INNER JOIN itsm_requests t2
--     ON t1.request_id = t2.request_id AND t1.id > t2.id;
-- (Only if the table has a surrogate `id` column.)

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND index_name = 'uk_itsm_requests_request_id'
);

SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `itsm_requests` ADD UNIQUE KEY `uk_itsm_requests_request_id` (`request_id`)',
  'SELECT ''uk_itsm_requests_request_id already exists'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
