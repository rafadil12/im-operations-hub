-- Permanent audit trail for writes, settings changes, and login/logout.
-- Rows are kept forever: do not add a purge job for this table.

CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `actor_system_user_id` INT NULL,
  `actor_user_id` INT NULL,
  `actor_label` VARCHAR(255) NULL,
  `module` VARCHAR(64) NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `summary` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_events_created` (`created_at`),
  KEY `idx_audit_events_module` (`module`),
  KEY `idx_audit_events_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
