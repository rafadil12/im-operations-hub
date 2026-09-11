-- Stock levels L01–L04: qty is item × storage location × level.
-- Existing balances and mat-doc lines backfill to L01 (Lantai 1).
-- Prefer: node --env-file=.env.development.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `sparepart_stock_levels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(8) NOT NULL,
  `name_en` VARCHAR(64) NOT NULL,
  `name_cn` VARCHAR(64) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sparepart_stock_levels_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sparepart_stock_levels` (`code`, `name_en`, `name_cn`, `sort_order`, `is_active`)
VALUES
  ('L01', 'Lantai 1', '一楼', 1, 1),
  ('L02', 'Lantai 2', '二楼', 2, 1),
  ('L03', 'Lantai 3', '三楼', 3, 1),
  ('L04', 'Lantai 4', '四楼', 4, 1)
ON DUPLICATE KEY UPDATE
  `name_en` = VALUES(`name_en`),
  `name_cn` = VALUES(`name_cn`),
  `sort_order` = VALUES(`sort_order`);
