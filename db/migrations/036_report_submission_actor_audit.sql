-- 036: Report per-(week, area) created/updated actor audit + allow duplicate sub-items.
-- Identity report lives on report_week_submissions (UNIQUE week_id, area_id).
-- Adds created_by/updated_by alongside existing submitted_by columns.
-- Drops uk_report_lines_week_area_subitem so the same sub-item may appear
-- on multiple lines in one week report (different targets / completion types).
-- Idempotent guards live in db/run-migrations.mjs.

ALTER TABLE `report_week_submissions`
  ADD COLUMN `created_by_system_user_id` INT NULL AFTER `submitted_by_label`,
  ADD COLUMN `created_by_label` VARCHAR(255) NULL AFTER `created_by_system_user_id`,
  ADD COLUMN `updated_by_system_user_id` INT NULL AFTER `created_by_label`,
  ADD COLUMN `updated_by_label` VARCHAR(255) NULL AFTER `updated_by_system_user_id`;
