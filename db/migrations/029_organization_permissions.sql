-- Organization module RBAC catalog.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.overview.view', 'View organization overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.overview.view');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.employee.read', 'View organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.employee.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.employee.create', 'Create organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.employee.create');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.employee.update', 'Update organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.employee.update');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.employee.delete', 'Delete organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.employee.delete');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.shift.read', 'View shift schedules and assignments'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.shift.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.shift.manage', 'Manage shift schedules and assignments'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.shift.manage');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.attendance.read', 'View attendance and leave records'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.attendance.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'organization.attendance.manage', 'Manage attendance sync and leave requests'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'organization.attendance.manage');

-- Preserve prior daily-master org access: grant full organization ops
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'daily_operation.master.manage'
JOIN `access_permissions` p_new ON p_new.code IN (
  'organization.overview.view',
  'organization.employee.read',
  'organization.employee.create',
  'organization.employee.update',
  'organization.employee.delete',
  'organization.shift.read',
  'organization.shift.manage',
  'organization.attendance.read',
  'organization.attendance.manage'
)
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Overview viewers also get organization overview read
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'overview.view'
JOIN `access_permissions` p_new ON p_new.code = 'organization.overview.view'
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Admin / superadmin get every permission
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `access_roles` r
CROSS JOIN `access_permissions` p
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (
    SELECT 1 FROM `access_role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
