-- Daily Operation PIC is an opt-in flag on login accounts.
-- Prefer: node --env-file=.env.local db/run-migrations.mjs
-- Do not re-run this file if the column already exists.

ALTER TABLE `system_users`
  ADD COLUMN `is_daily_operation_pic` TINYINT(1) NOT NULL DEFAULT 0;

UPDATE `system_users` su
INNER JOIN `users` u ON u.id = su.user_id
SET su.is_daily_operation_pic = 1
WHERE su.is_active = 1
  AND UPPER(COALESCE(u.employee_no, '')) <> 'SUPERADMIN';
