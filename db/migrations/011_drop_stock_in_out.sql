-- Drop denormalized lifetime counters; totals come from mat docs when needed.
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

ALTER TABLE `sparepart_items` DROP COLUMN `stock_in`;
ALTER TABLE `sparepart_items` DROP COLUMN `stock_out`;
