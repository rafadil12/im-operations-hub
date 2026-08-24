-- Replace sparepart_items.name/brand with bilingual columns.
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

ALTER TABLE `sparepart_items`
  ADD COLUMN `name_en` VARCHAR(255) NULL AFTER `code`,
  ADD COLUMN `name_cn` VARCHAR(255) NULL AFTER `name_en`,
  ADD COLUMN `brand_en` VARCHAR(128) NULL AFTER `name_cn`,
  ADD COLUMN `brand_cn` VARCHAR(128) NULL AFTER `brand_en`;

UPDATE `sparepart_items` SET
  `name_en` = COALESCE(`name_en`, `name`),
  `name_cn` = COALESCE(`name_cn`, `name`),
  `brand_en` = COALESCE(`brand_en`, `brand`),
  `brand_cn` = COALESCE(`brand_cn`, `brand`);

ALTER TABLE `sparepart_items`
  DROP COLUMN `name`,
  DROP COLUMN `brand`;
