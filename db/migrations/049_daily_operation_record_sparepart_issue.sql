-- Link one Change Request activity to a single goods-issue (201) document.
-- Applied piecewise (column guards) by db/run-migrations.mjs.
-- Prefer: node --env-file=.env.development.local db/run-migrations.mjs

ALTER TABLE `daily_operation_record`
  ADD COLUMN `sparepart_item_id` INT NULL AFTER `end_time`,
  ADD COLUMN `sparepart_qty` INT NULL AFTER `sparepart_item_id`,
  ADD COLUMN `sparepart_storage_location_id` INT NULL AFTER `sparepart_qty`,
  ADD COLUMN `sparepart_level_id` INT NULL AFTER `sparepart_storage_location_id`,
  ADD COLUMN `sparepart_mat_doc_id` INT NULL AFTER `sparepart_level_id`;
