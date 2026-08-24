-- Material master only (inbound/outbound replaced by mat docs in 004)
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `sparepart_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `brand` VARCHAR(128) NULL,
  `model` VARCHAR(255) NULL,
  `location` VARCHAR(255) NULL,
  `stock_current` INT NOT NULL DEFAULT 0,
  `image_url` VARCHAR(512) NULL,
  `notes` TEXT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sparepart_items_code` (`code`),
  KEY `idx_sparepart_items_location` (`location`),
  KEY `idx_sparepart_items_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
