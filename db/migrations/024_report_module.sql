-- Report module: weekly area reports (MES, Logistics, IT, Safety).
-- Week calendar: Saturday (day 1) through Friday (day 7); report due Friday.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `report_areas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `name_en` VARCHAR(100) NOT NULL,
  `name_cn` VARCHAR(100) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_areas_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_category_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `area_id` INT NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name_en` VARCHAR(200) NOT NULL,
  `name_cn` VARCHAR(200) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_category_area_code` (`area_id`, `code`),
  KEY `idx_report_category_area` (`area_id`),
  CONSTRAINT `fk_report_category_area`
    FOREIGN KEY (`area_id`) REFERENCES `report_areas` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_weeks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `year` INT NOT NULL,
  `week_number` INT NOT NULL,
  `label` VARCHAR(32) NOT NULL,
  `starts_on` DATE NOT NULL,
  `ends_on` DATE NOT NULL,
  `report_due_on` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_weeks_year_num` (`year`, `week_number`),
  KEY `idx_report_weeks_starts_on` (`starts_on`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_week_submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `week_id` INT NOT NULL,
  `area_id` INT NOT NULL,
  `status` ENUM('draft', 'submitted') NOT NULL DEFAULT 'draft',
  `submitted_at` DATETIME NULL,
  `submitted_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_submission_week_area` (`week_id`, `area_id`),
  KEY `idx_report_submission_area` (`area_id`),
  CONSTRAINT `fk_report_submission_week`
    FOREIGN KEY (`week_id`) REFERENCES `report_weeks` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_report_submission_area`
    FOREIGN KEY (`area_id`) REFERENCES `report_areas` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_lines` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `week_id` INT NOT NULL,
  `area_id` INT NOT NULL,
  `category_template_id` INT NULL,
  `work_target_en` TEXT NOT NULL,
  `work_target_cn` TEXT NOT NULL,
  `weekly_completion_rate` DECIMAL(5,4) NULL,
  `summary_en` TEXT NOT NULL,
  `summary_cn` TEXT NOT NULL,
  `plan_en` TEXT NULL,
  `plan_cn` TEXT NULL,
  `import_key` VARCHAR(191) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_lines_import_key` (`import_key`),
  KEY `idx_report_lines_week_area` (`week_id`, `area_id`),
  KEY `idx_report_lines_category` (`category_template_id`),
  CONSTRAINT `fk_report_lines_week`
    FOREIGN KEY (`week_id`) REFERENCES `report_weeks` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_report_lines_area`
    FOREIGN KEY (`area_id`) REFERENCES `report_areas` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_report_lines_category`
    FOREIGN KEY (`category_template_id`) REFERENCES `report_category_templates` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `report_areas` (`code`, `name_en`, `name_cn`, `sort_order`)
SELECT 'MES', 'MOM', 'MOM项', 1
WHERE NOT EXISTS (SELECT 1 FROM `report_areas` WHERE `code` = 'MES');

INSERT INTO `report_areas` (`code`, `name_en`, `name_cn`, `sort_order`)
SELECT 'LOGISTICS', 'Smart Logistics', '智能物流', 2
WHERE NOT EXISTS (SELECT 1 FROM `report_areas` WHERE `code` = 'LOGISTICS');

INSERT INTO `report_areas` (`code`, `name_en`, `name_cn`, `sort_order`)
SELECT 'IT', 'IT', 'IT', 3
WHERE NOT EXISTS (SELECT 1 FROM `report_areas` WHERE `code` = 'IT');

INSERT INTO `report_areas` (`code`, `name_en`, `name_cn`, `sort_order`)
SELECT 'SAFETY', 'Safety Officer', '安全员', 4
WHERE NOT EXISTS (SELECT 1 FROM `report_areas` WHERE `code` = 'SAFETY');

INSERT INTO `report_category_templates` (`area_id`, `code`, `name_en`, `name_cn`, `sort_order`)
SELECT a.id, v.code, v.name_en, v.name_cn, v.sort_order
FROM `report_areas` a
JOIN (
  SELECT 'MES' AS area_code, 'traceability' AS code, 'Traceability' AS name_en, '追溯' AS name_cn, 1 AS sort_order UNION ALL
  SELECT 'MES', 'data_collection', 'Data collection', '数据采集', 2 UNION ALL
  SELECT 'MES', 'system_om', 'System O&M incidents', '系统运维事件', 3 UNION ALL
  SELECT 'MES', 'development', 'Development', '开发事件', 4 UNION ALL
  SELECT 'MES', 'requirements', 'Requirements', '需求事件', 5 UNION ALL
  SELECT 'LOGISTICS', 'operations', 'Operations & maintenance', '运维', 1 UNION ALL
  SELECT 'LOGISTICS', 'staff_training', 'Staff training', '人员培训', 2 UNION ALL
  SELECT 'LOGISTICS', 'sop_docs', 'SOP documentation', 'SOP整理', 3 UNION ALL
  SELECT 'IT', 'it_ops', 'IT Operations', 'IT运维', 1 UNION ALL
  SELECT 'IT', 'project', 'Project', '项目', 2 UNION ALL
  SELECT 'SAFETY', 'safety_assessment', 'Safety responsibility assessment', '安全生产责任考核', 1 UNION ALL
  SELECT 'SAFETY', 'staff_training', 'Staff training', '人员培训', 2 UNION ALL
  SELECT 'SAFETY', 'monthly_report', 'End-of-month safety report', '月末安全报告', 3
) v ON v.area_code = a.code
WHERE NOT EXISTS (
  SELECT 1 FROM `report_category_templates` c
  WHERE c.area_id = a.id AND c.code = v.code
);

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.overview.view', 'View report overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.overview.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.line.read', 'View weekly report lines'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.line.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.line.create', 'Create weekly report lines'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.line.create');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.line.update', 'Update weekly report lines'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.line.update');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.line.delete', 'Delete weekly report lines'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.line.delete');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.submission.submit', 'Submit weekly report for an area'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.submission.submit');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN ('report.overview.view', 'report.line.read')
WHERE r.name = 'viewer'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name IN ('admin', 'superadmin')
  AND p.code LIKE 'report.%'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
