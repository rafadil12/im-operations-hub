-- Report module: line revisions audit trail.
-- Unique (week, area, sub-item) and submitter columns applied in run-migrations.mjs.

CREATE TABLE IF NOT EXISTS `report_line_revisions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `line_id` INT NOT NULL,
  `revision_no` INT NOT NULL,
  `changed_by_system_user_id` INT NULL,
  `changed_by_label` VARCHAR(255) NULL,
  `changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `snapshot` JSON NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_line_revisions_line_rev` (`line_id`, `revision_no`),
  KEY `idx_report_line_revisions_line` (`line_id`),
  CONSTRAINT `fk_report_line_revisions_line`
    FOREIGN KEY (`line_id`) REFERENCES `report_lines` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
