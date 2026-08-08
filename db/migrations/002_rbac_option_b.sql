-- Option B RBAC: one role per system_user + role_permissions junction.
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

-- Roles seed
INSERT INTO `roles` (`name`, `description`)
SELECT 'admin', 'Full system access including Settings'
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'admin');

INSERT INTO `roles` (`name`, `description`)
SELECT 'manager', 'Manage operations and view analytics'
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'manager');

INSERT INTO `roles` (`name`, `description`)
SELECT 'operator', 'Create and update daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'operator');

INSERT INTO `roles` (`name`, `description`)
SELECT 'viewer', 'Read-only access'
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'viewer');

-- Permissions seed
INSERT INTO `permissions` (`code`, `description`)
SELECT 'settings.access', 'Access Settings module'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'settings.access');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.record.read', 'View daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.record.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.record.create', 'Create daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.record.create');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.record.update', 'Update daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.record.update');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.record.delete', 'Delete daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.record.delete');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.analysis.view', 'View daily operation analysis'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.analysis.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.master.manage', 'Manage daily operation master data'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.master.manage');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'itsm.view', 'View ITSM module'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'itsm.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'admin.roles.manage', 'Manage roles and permissions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'admin.roles.manage');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'admin.accounts.manage', 'Manage login accounts and role assignment'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'admin.accounts.manage');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'sparepart.document.post', 'Post sparepart material documents'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'sparepart.document.post');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'sparepart.document.reverse', 'Reverse sparepart material documents'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'sparepart.document.reverse');

-- role_permissions: admin gets all
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- manager
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN (
  'daily_operation.record.read',
  'daily_operation.record.create',
  'daily_operation.record.update',
  'daily_operation.record.delete',
  'daily_operation.analysis.view',
  'daily_operation.master.manage',
  'itsm.view',
  'sparepart.document.post',
  'sparepart.document.reverse'
)
WHERE r.name = 'manager'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- operator
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN (
  'daily_operation.record.read',
  'daily_operation.record.create',
  'daily_operation.record.update',
  'daily_operation.analysis.view',
  'itsm.view',
  'sparepart.document.post',
  'sparepart.document.reverse'
)
WHERE r.name = 'operator'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- viewer
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN (
  'daily_operation.record.read',
  'daily_operation.analysis.view',
  'itsm.view'
)
WHERE r.name = 'viewer'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Assign admin role to user_id = 1 (bootstrap)
UPDATE `system_users` su
JOIN `roles` r ON r.name = 'admin'
SET su.role_id = r.id
WHERE su.user_id = 1;

-- Reset all login passwords to Admin@123 for local testing
UPDATE `system_users`
SET `password_hash` = '$2b$12$cI4pxfYd4Rl7BCh28HcnJOjYPSgw2e83P4xhntednum009ojIEp/W';
