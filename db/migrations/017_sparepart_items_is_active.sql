-- Active / non-active flag for sparepart materials (separate from soft-delete).
-- Non-active materials are excluded from low/critical stock alerts.
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

ALTER TABLE `sparepart_items`
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1
  AFTER `min_stock`;
