-- Drop material default storage location preference.
-- Storage location is chosen explicitly on each goods movement.

ALTER TABLE `sparepart_items` DROP FOREIGN KEY `fk_sparepart_items_default_loc`;
ALTER TABLE `sparepart_items` DROP COLUMN `default_storage_location_id`;
