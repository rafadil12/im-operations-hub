-- Session invalidation: bump on password change/reset so old cookies fail.
-- Prefer db/run-migrations.mjs (idempotent). Do not re-run this file if the
-- column already exists — MySQL will error with "Duplicate column name".

ALTER TABLE `system_users`
  ADD COLUMN `session_version` INT NOT NULL DEFAULT 1;
