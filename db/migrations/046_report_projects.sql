-- Report Projects module (Excel-style project progress reports).
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `report_project_reports` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `report_date` DATE NOT NULL,
  `project_department` VARCHAR(500) NOT NULL,
  `reporter_name` VARCHAR(200) NOT NULL,
  `cycle_label` VARCHAR(64) NOT NULL,
  `year` INT NOT NULL,
  `week_number` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_report_project_reports_year_week` (`year`, `week_number`),
  KEY `idx_report_project_reports_date` (`report_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_project_lines` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `report_id` INT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `target` TEXT NOT NULL,
  `main_task` TEXT NULL,
  `current_priority` VARCHAR(64) NULL,
  `plan_start` DATE NULL,
  `plan_end` DATE NULL,
  `health` ENUM('healthy', 'mild', 'serious') NOT NULL DEFAULT 'healthy',
  `line_status` ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  `progress_ratio` DECIMAL(5,4) NULL,
  `pic` TEXT NULL,
  `this_week_progress` TEXT NULL,
  `next_week_plan` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_report_project_lines_report` (`report_id`),
  CONSTRAINT `fk_report_project_lines_report`
    FOREIGN KEY (`report_id`) REFERENCES `report_project_reports` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.project.read', 'View report projects'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.project.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.project.create', 'Create report projects'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.project.create');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.project.update', 'Update report projects'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.project.update');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.project.delete', 'Delete report projects'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.project.delete');

-- Roles that can read weekly report lines also get project read (continuity).
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `role_permissions` rp
JOIN `permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'report.line.read'
JOIN `permissions` p_new ON p_new.code = 'report.project.read'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Roles with line create/update/delete get matching project write.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `role_permissions` rp
JOIN `permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'report.line.create'
JOIN `permissions` p_new ON p_new.code = 'report.project.create'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `role_permissions` rp
JOIN `permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'report.line.update'
JOIN `permissions` p_new ON p_new.code = 'report.project.update'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `role_permissions` rp
JOIN `permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'report.line.delete'
JOIN `permissions` p_new ON p_new.code = 'report.project.delete'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Guest: project read only.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'guest'
  AND p.code = 'report.project.read'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Admin / superadmin get every permission.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
