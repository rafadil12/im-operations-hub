-- ITSM requests: ensure row id, normalize dates, dedupe request_id, add indexes.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

-- Some legacy dumps have no surrogate key; add one before dedupe.
SET @col_id := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND column_name = 'id'
);

SET @sql_id := IF(
  @col_id = 0,
  'ALTER TABLE `itsm_requests` ADD COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST',
  'SELECT ''itsm_requests.id already exists'' AS info'
);

PREPARE stmt FROM @sql_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DELETE t1
FROM itsm_requests t1
INNER JOIN itsm_requests t2
  ON t1.request_id = t2.request_id
 AND t1.id < t2.id;

SET @col_created_at := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND column_name = 'created_at'
);

SET @sql_created_at := IF(
  @col_created_at = 0,
  'ALTER TABLE `itsm_requests` ADD COLUMN `created_at` DATETIME NULL AFTER `created_date`',
  'SELECT ''itsm_requests.created_at already exists'' AS info'
);

PREPARE stmt FROM @sql_created_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_due_at := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND column_name = 'due_at'
);

SET @sql_due_at := IF(
  @col_due_at = 0,
  'ALTER TABLE `itsm_requests` ADD COLUMN `due_at` DATETIME NULL AFTER `due_by_date`',
  'SELECT ''itsm_requests.due_at already exists'' AS info'
);

PREPARE stmt FROM @sql_due_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE itsm_requests
SET created_at = STR_TO_DATE(created_date, '%d/%m/%Y %h:%i %p')
WHERE created_at IS NULL
  AND created_date IS NOT NULL
  AND created_date <> '';

UPDATE itsm_requests
SET due_at = STR_TO_DATE(due_by_date, '%d/%m/%Y %h:%i %p')
WHERE due_at IS NULL
  AND due_by_date IS NOT NULL
  AND due_by_date <> '';

SET @idx_request_id := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND index_name = 'uk_itsm_requests_request_id'
);

SET @sql_request_id := IF(
  @idx_request_id = 0,
  'ALTER TABLE `itsm_requests` ADD UNIQUE KEY `uk_itsm_requests_request_id` (`request_id`)',
  'SELECT ''uk_itsm_requests_request_id already exists'' AS info'
);

PREPARE stmt FROM @sql_request_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_created_at := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND index_name = 'idx_itsm_created_at'
);

SET @sql_created_at_idx := IF(
  @idx_created_at = 0,
  'ALTER TABLE `itsm_requests` ADD KEY `idx_itsm_created_at` (`created_at`)',
  'SELECT ''idx_itsm_created_at already exists'' AS info'
);

PREPARE stmt FROM @sql_created_at_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_status := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND index_name = 'idx_itsm_status'
);

SET @sql_status := IF(
  @idx_status = 0,
  'ALTER TABLE `itsm_requests` ADD KEY `idx_itsm_status` (`status`)',
  'SELECT ''idx_itsm_status already exists'' AS info'
);

PREPARE stmt FROM @sql_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_status_created := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND index_name = 'idx_itsm_status_created'
);

SET @sql_status_created := IF(
  @idx_status_created = 0,
  'ALTER TABLE `itsm_requests` ADD KEY `idx_itsm_status_created` (`status`, `created_at`)',
  'SELECT ''idx_itsm_status_created already exists'' AS info'
);

PREPARE stmt FROM @sql_status_created;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_group := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND index_name = 'idx_itsm_group'
);

SET @sql_group := IF(
  @idx_group = 0,
  'ALTER TABLE `itsm_requests` ADD KEY `idx_itsm_group` (`group_name`)',
  'SELECT ''idx_itsm_group already exists'' AS info'
);

PREPARE stmt FROM @sql_group;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_technician := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'itsm_requests'
    AND index_name = 'idx_itsm_technician'
);

SET @sql_technician := IF(
  @idx_technician = 0,
  'ALTER TABLE `itsm_requests` ADD KEY `idx_itsm_technician` (`technician`)',
  'SELECT ''idx_itsm_technician already exists'' AS info'
);

PREPARE stmt FROM @sql_technician;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
