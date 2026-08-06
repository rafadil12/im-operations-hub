-- Drop legacy sparepart_items.location (varchar display string).
-- Stock locations live in sparepart_storage_locations + sparepart_stock_balances.

ALTER TABLE `sparepart_items` DROP INDEX `idx_sparepart_items_location`;
ALTER TABLE `sparepart_items` DROP COLUMN `location`;
