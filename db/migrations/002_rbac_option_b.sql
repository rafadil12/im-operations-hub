-- Option B RBAC: one role per system_user + role_permissions junction.
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs
-- Permission catalog is completed/migrated by 006_permissions_catalog_v2.sql

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

-- Permissions seed (19-code catalog)
INSERT INTO `permissions` (`code`, `description`)
SELECT 'overview.view', 'View Overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'overview.view');

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
SELECT 'daily_operation.record.import', 'Import daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.record.import');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.record.export', 'Export daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.record.export');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.record.template', 'Download daily operation import template'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.record.template');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.analysis.view', 'View daily operation analysis'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.analysis.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'daily_operation.master.manage', 'Manage daily operation master data'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'daily_operation.master.manage');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'itsm.overview.view', 'View ITSM overview'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'itsm.overview.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'itsm.request.read', 'View ITSM requests list'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'itsm.request.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'itsm.request.import', 'Import ITSM requests'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'itsm.request.import');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'itsm.request.export', 'Export ITSM requests'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'itsm.request.export');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'itsm.request.template', 'Download ITSM import template'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'itsm.request.template');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'itsm.analysis.view', 'View ITSM analysis'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'itsm.analysis.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'admin.roles.manage', 'Manage roles and permissions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'admin.roles.manage');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'admin.accounts.manage', 'Manage login accounts and role assignment'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'admin.accounts.manage');

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
  'overview.view',
  'daily_operation.record.read',
  'daily_operation.record.create',
  'daily_operation.record.update',
  'daily_operation.record.delete',
  'daily_operation.analysis.view',
  'daily_operation.master.manage',
  'itsm.overview.view',
  'itsm.request.read',
  'itsm.analysis.view'
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
  'overview.view',
  'daily_operation.record.read',
  'daily_operation.record.create',
  'daily_operation.record.update',
  'daily_operation.analysis.view',
  'itsm.overview.view',
  'itsm.request.read',
  'itsm.analysis.view'
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
  'overview.view',
  'daily_operation.record.read',
  'daily_operation.analysis.view',
  'itsm.overview.view',
  'itsm.request.read',
  'itsm.analysis.view'
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

-- NOTE: Do not mass-reset passwords here. For local bootstrap only, run
-- migrations with ALLOW_DEV_PASSWORD_RESET=1 (see db/run-migrations.mjs).
