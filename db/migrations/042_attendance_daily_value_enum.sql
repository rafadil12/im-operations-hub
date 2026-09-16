-- attendance_daily.attendance_value stores shift hours only (4/8/10.5/OFF).
-- Leave types (AL/MC/UPL/A) live on attendance_leave_requests; daily rows use
-- source=LEAVE + leave_request_id and resolve type via JOIN.
-- Prefer: node --env-file=.env.development.local db/run-migrations.mjs
-- Remap + MODIFY guards live in db/run-migrations.mjs.

UPDATE `attendance_daily`
SET `attendance_value` = 'OFF'
WHERE `attendance_value` IN ('AL', 'MC', 'UPL', 'A');

ALTER TABLE `attendance_daily`
  MODIFY COLUMN `attendance_value` ENUM('4','8','10.5','OFF') NOT NULL;
