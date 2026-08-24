-- Multi-location stock: storage locations + balances (IM-style)
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs
-- Seed / exception overrides are applied in the migration runner (not this file).

CREATE TABLE IF NOT EXISTS `sparepart_storage_locations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sparepart_storage_locations_code` (`code`),
  KEY `idx_sparepart_storage_locations_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sparepart_stock_balances` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item_id` INT NOT NULL,
  `storage_location_id` INT NOT NULL,
  `qty` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sparepart_stock_balances_item_loc` (`item_id`, `storage_location_id`),
  KEY `idx_sparepart_stock_balances_loc` (`storage_location_id`),
  CONSTRAINT `fk_sparepart_stock_balances_item`
    FOREIGN KEY (`item_id`) REFERENCES `sparepart_items` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sparepart_stock_balances_loc`
    FOREIGN KEY (`storage_location_id`) REFERENCES `sparepart_storage_locations` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
