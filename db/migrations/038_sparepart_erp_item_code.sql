-- ERP item code on material master (optional).
-- Prefer: node --env-file=.env.development.local db/run-migrations.mjs

ALTER TABLE `sparepart_items`
  ADD COLUMN `erp_item_code` VARCHAR(64) NULL AFTER `code`;
