-- Client metadata for Logs Center detail view.
-- Applied with column guards by db/run-migrations.mjs.

ALTER TABLE `logs_center_events`
  ADD COLUMN `ip_address` VARCHAR(45) NULL AFTER `links_json`,
  ADD COLUMN `user_agent` VARCHAR(255) NULL AFTER `ip_address`;
