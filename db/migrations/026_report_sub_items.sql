-- Report module: replace report_category_templates with report_sub_items (Excel sub-item column).
-- Idempotent create only; column migration handled in run-migrations.mjs.

CREATE TABLE IF NOT EXISTS `report_sub_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `area_id` INT NOT NULL,
  `name_en` VARCHAR(200) NOT NULL,
  `name_cn` VARCHAR(200) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_sub_items_area_cn` (`area_id`, `name_cn`),
  KEY `idx_report_sub_items_area` (`area_id`),
  CONSTRAINT `fk_report_sub_items_area`
    FOREIGN KEY (`area_id`) REFERENCES `report_areas` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
