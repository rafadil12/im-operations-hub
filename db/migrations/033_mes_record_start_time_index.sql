-- Speed up MES record listings and analysis by deleted_at + start_time.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

SET @idx_deleted_start := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'mes_record'
    AND index_name = 'idx_mes_record_deleted_start'
);

SET @sql_deleted_start := IF(
  @idx_deleted_start = 0,
  'ALTER TABLE `mes_record` ADD KEY `idx_mes_record_deleted_start` (`deleted_at`, `start_time`)',
  'SELECT ''idx_mes_record_deleted_start already exists'' AS info'
);

PREPARE stmt FROM @sql_deleted_start;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
