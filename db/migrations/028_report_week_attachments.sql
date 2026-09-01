-- Report module: file attachments per week report (week × area).

CREATE TABLE IF NOT EXISTS `report_week_attachments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `week_id` INT NOT NULL,
  `area_id` INT NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(512) NOT NULL,
  `mime_type` VARCHAR(128) NULL,
  `file_size` BIGINT NULL,
  `uploaded_by_system_user_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_report_week_attachments_week_area` (`week_id`, `area_id`),
  CONSTRAINT `fk_report_week_attachments_week`
    FOREIGN KEY (`week_id`) REFERENCES `report_weeks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_report_week_attachments_area`
    FOREIGN KEY (`area_id`) REFERENCES `report_areas` (`id`) ON DELETE CASCADE
);
