-- Canonical attendance leave pending / history tables (match production).
-- Idempotent CREATE; ALTER guards for pending live in db/run-migrations.mjs.
-- Prefer: node --env-file=.env.development.local db/run-migrations.mjs

CREATE TABLE IF NOT EXISTS `attendance_leave_pending` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_no` VARCHAR(50) NOT NULL,
  `request_date` DATE NOT NULL,
  `request_type` ENUM('AL','MC','UPL','OT','ALPA','NO_ATTENDANCE') NOT NULL,
  `oa_number` VARCHAR(100) NULL,
  `no_attendance_type` ENUM('NO_CHECK_IN','NO_CHECK_OUT','NO_CHECK_IN_OUT') NULL,
  `start_time` TIME NULL,
  `end_time` TIME NULL,
  `reason` TEXT NOT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pending_employee_date` (`employee_no`, `request_date`),
  KEY `idx_pending_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `attendance_leave_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_no` VARCHAR(50) NOT NULL,
  `request_date` DATE NOT NULL,
  `request_type` ENUM('AL','MC','UPL','OT','ALPA','NO_ATTENDANCE') NOT NULL,
  `oa_number` VARCHAR(100) NULL,
  `no_attendance_type` ENUM('NO_CHECK_IN','NO_CHECK_OUT','NO_CHECK_IN_OUT') NULL,
  `start_time` TIME NULL,
  `end_time` TIME NULL,
  `reason` TEXT NOT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `status` ENUM('Rejected') NOT NULL DEFAULT 'Rejected',
  `rejected_by` VARCHAR(50) NOT NULL,
  `rejected_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_history_employee_date` (`employee_no`, `request_date`),
  KEY `idx_leave_history_rejected_at` (`rejected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
