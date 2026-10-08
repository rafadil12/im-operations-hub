-- Structured Logs Center remarks. The screen builds the sentence from these
-- columns. summary stays the English sentence so older rows and search still work.
-- Applied with column guards by db/run-migrations.mjs.

ALTER TABLE `logs_center_events`
  ADD COLUMN `object_type` VARCHAR(64) NULL AFTER `action`,
  ADD COLUMN `object_ref` VARCHAR(64) NULL AFTER `object_type`,
  ADD COLUMN `changes_json` JSON NULL AFTER `summary`,
  ADD COLUMN `links_json` JSON NULL AFTER `changes_json`;
