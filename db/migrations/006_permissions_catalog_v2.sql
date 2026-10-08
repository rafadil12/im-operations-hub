-- Expand permission catalog to 19 codes; migrate legacy itsm.view + settings.access I/O coupling.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

-- --- Seed new permissions ---
INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'overview.view', 'View Overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'overview.view');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.record.import', 'Import daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.record.import');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.record.export', 'Export daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.record.export');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.record.template', 'Download daily operation import template'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.record.template');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'itsm.overview.view', 'View ITSM overview'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'itsm.overview.view');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'itsm.request.read', 'View ITSM requests list'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'itsm.request.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'itsm.request.import', 'Import ITSM requests'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'itsm.request.import');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'itsm.request.export', 'Export ITSM requests'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'itsm.request.export');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'itsm.request.template', 'Download ITSM import template'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'itsm.request.template');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'itsm.analysis.view', 'View ITSM analysis'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'itsm.analysis.view');

-- Ensure legacy codes still exist for migration sources / fresh 002 seed
INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'settings.access', 'Access Settings module'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'settings.access');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.record.read', 'View daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.record.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.record.create', 'Create daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.record.create');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.record.update', 'Update daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.record.update');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.record.delete', 'Delete daily operation records'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.record.delete');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.analysis.view', 'View daily operation analysis'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.analysis.view');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'daily_operation.master.manage', 'Manage daily operation master data'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'daily_operation.master.manage');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'admin.roles.manage', 'Manage roles and permissions'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'admin.roles.manage');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'admin.accounts.manage', 'Manage login accounts and role assignment'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'admin.accounts.manage');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.document.post', 'Post sparepart material documents'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.document.post');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.document.reverse', 'Reverse sparepart material documents'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.document.reverse');

-- --- Migrate itsm.view → split ITSM codes ---
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id AND p_old.code = 'itsm.view'
JOIN `access_permissions` p_new ON p_new.code IN (
  'itsm.overview.view',
  'itsm.request.read',
  'itsm.analysis.view'
)
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- --- Migrate settings.access I/O coupling → dedicated import/export/template ---
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id AND p_old.code = 'settings.access'
JOIN `access_permissions` p_new ON p_new.code IN (
  'daily_operation.record.import',
  'daily_operation.record.export',
  'daily_operation.record.template',
  'itsm.request.import',
  'itsm.request.export',
  'itsm.request.template'
)
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- --- overview.view for roles that already had module visibility ---
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_ov.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p ON p.id = rp.permission_id
JOIN `access_permissions` p_ov ON p_ov.code = 'overview.view'
WHERE p.code IN (
  'daily_operation.record.read',
  'daily_operation.analysis.view',
  'itsm.view',
  'itsm.overview.view',
  'itsm.request.read',
  'itsm.analysis.view',
  'settings.access',
  'admin.roles.manage',
  'admin.accounts.manage'
)
AND NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_ov.id
);

-- Admin gets every permission in catalog
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `access_roles` r
CROSS JOIN `access_permissions` p
WHERE r.name = 'admin'
  AND p.code != 'itsm.view'
  AND NOT EXISTS (
    SELECT 1 FROM `access_role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Drop legacy itsm.view mappings and row
DELETE rp FROM `access_role_permissions` rp
JOIN `access_permissions` p ON p.id = rp.permission_id
WHERE p.code = 'itsm.view';

DELETE FROM `access_permissions` WHERE `code` = 'itsm.view';
