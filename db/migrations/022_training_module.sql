-- Training module: sessions (MES / Intelligent / IT), participants, permissions.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `training_participants` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_training_participants_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `training_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_date` DATE NOT NULL,
  `category` ENUM('mes', 'intelligent', 'it') NOT NULL,
  `topic` VARCHAR(500) NOT NULL,
  `participant_count` INT NOT NULL DEFAULT 0,
  `attachment_original_name` VARCHAR(255) NULL,
  `attachment_stored_name` VARCHAR(255) NULL,
  `attachment_url` VARCHAR(512) NULL,
  `attachment_mime_type` VARCHAR(128) NULL,
  `attachment_size` BIGINT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training_sessions_date` (`session_date`),
  KEY `idx_training_sessions_category` (`category`),
  KEY `idx_training_sessions_date_category` (`session_date`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `training_session_participants` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_id` INT NOT NULL,
  `participant_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tsp_session` (`session_id`),
  KEY `idx_tsp_name` (`participant_name`),
  CONSTRAINT `fk_tsp_session`
    FOREIGN KEY (`session_id`) REFERENCES `training_sessions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permissions` (`code`, `description`)
SELECT 'training.overview.view', 'View training overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'training.overview.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'training.session.read', 'View training sessions and files'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'training.session.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'training.session.create', 'Create training sessions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'training.session.create');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'training.session.update', 'Update training sessions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'training.session.update');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'training.session.delete', 'Delete training sessions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'training.session.delete');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN (
  'training.overview.view',
  'training.session.read'
)
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
  AND p.code LIKE 'training.%'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
