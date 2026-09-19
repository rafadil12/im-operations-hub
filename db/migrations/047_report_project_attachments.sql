-- Report Projects: file attachments per project report.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `report_project_attachments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `report_id` INT NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(512) NOT NULL,
  `mime_type` VARCHAR(128) NULL,
  `file_size` BIGINT NULL,
  `uploaded_by_system_user_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_report_project_attachments_report` (`report_id`),
  CONSTRAINT `fk_report_project_attachments_report`
    FOREIGN KEY (`report_id`) REFERENCES `report_project_reports` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
