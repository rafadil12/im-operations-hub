-- Unit of measure master for sparepart materials.
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `uoms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(16) NOT NULL,
  `name_en` VARCHAR(64) NOT NULL,
  `name_cn` VARCHAR(64) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uoms_code` (`code`),
  KEY `idx_uoms_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
