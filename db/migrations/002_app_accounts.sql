-- Auth accounts for IM One login (separate from MES master `users`).
-- Run once against the mes_dashboard database (e.g. via Navicat).
--
-- Also set AUTH_SECRET in .env.local (long random string) for JWT session cookies.
--
-- Seed password for admin@imone.com: Admin@123
-- Hash generated with bcryptjs cost 10.

CREATE TABLE IF NOT EXISTS `app_accounts` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255) NOT NULL,
  `employee_id`   VARCHAR(64)  NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name`  VARCHAR(128) NOT NULL,
  `role_label`    VARCHAR(64)  NOT NULL DEFAULT 'User',
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `last_login_at` DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_app_accounts_email` (`email`),
  UNIQUE KEY `uq_app_accounts_employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional RBAC tables (not used by menu yet; ready for future role-based access).
CREATE TABLE IF NOT EXISTS `app_roles` (
  `id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`    VARCHAR(64) NOT NULL,
  `name_en` VARCHAR(128) NOT NULL,
  `name_cn` VARCHAR(128) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_app_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_account_roles` (
  `account_id` BIGINT UNSIGNED NOT NULL,
  `role_id`    INT UNSIGNED NOT NULL,
  PRIMARY KEY (`account_id`, `role_id`),
  CONSTRAINT `fk_aar_account` FOREIGN KEY (`account_id`) REFERENCES `app_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aar_role` FOREIGN KEY (`role_id`) REFERENCES `app_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `app_roles` (`code`, `name_en`, `name_cn`) VALUES
  ('it_manager', 'IT Manager', 'IT经理'),
  ('viewer', 'Viewer', '访客')
ON DUPLICATE KEY UPDATE `name_en` = VALUES(`name_en`);

INSERT INTO `app_accounts` (
  `email`,
  `employee_id`,
  `password_hash`,
  `display_name`,
  `role_label`,
  `is_active`
) VALUES (
  'admin@imone.com',
  'ADMIN001',
  '$2b$10$dY/xPLGNLZ0wAaTp7RrFNueCtSilJgzirRPasIShq/zyqwj7LyF16',
  'Admin',
  'IT Manager',
  1
) ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

INSERT INTO `app_account_roles` (`account_id`, `role_id`)
SELECT a.id, r.id
FROM `app_accounts` a
CROSS JOIN `app_roles` r
WHERE a.email = 'admin@imone.com' AND r.code = 'it_manager'
ON DUPLICATE KEY UPDATE `account_id` = VALUES(`account_id`);
