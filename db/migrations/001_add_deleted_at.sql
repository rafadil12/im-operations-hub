-- Soft delete support for mes_data.
-- Run once against the mes_dashboard database (e.g. via Navicat).
-- After this, all list queries filter with `WHERE deleted_at IS NULL`.

ALTER TABLE `mes_data`
  ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL;
