-- Organization module RBAC catalog.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.overview.view', 'View organization overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.overview.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.employee.read', 'View organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.employee.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.employee.create', 'Create organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.employee.create');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.employee.update', 'Update organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.employee.update');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.employee.delete', 'Delete organization employees'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.employee.delete');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.shift.read', 'View shift schedules and assignments'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.shift.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.shift.manage', 'Manage shift schedules and assignments'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.shift.manage');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.attendance.read', 'View attendance and leave records'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.attendance.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'organization.attendance.manage', 'Manage attendance sync and leave requests'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'organization.attendance.manage');

-- Preserve prior daily-master org access: grant full organization ops
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `role_permissions` rp
JOIN `permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'daily_operation.master.manage'
JOIN `permissions` p_new ON p_new.code IN (
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
  SELECT 1 FROM `role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Overview viewers also get organization overview read
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `role_permissions` rp
JOIN `permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'overview.view'
JOIN `permissions` p_new ON p_new.code = 'organization.overview.view'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Viewer: read-only organization
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN (
  'organization.overview.view',
  'organization.employee.read',
  'organization.shift.read',
  'organization.attendance.read'
)
WHERE r.name = 'viewer'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Admin / superadmin get every permission
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
