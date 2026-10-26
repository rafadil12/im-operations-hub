-- Expand sparepart RBAC catalog; seed role defaults.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.stock.view', 'View sparepart stock overview'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.stock.view');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.document.read', 'View sparepart material documents'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.document.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.document.post', 'Post sparepart material documents'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.document.post');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.document.reverse', 'Reverse sparepart material documents'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.document.reverse');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.materials.read', 'View sparepart materials'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.materials.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.materials.create', 'Create sparepart materials'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.materials.create');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.materials.update', 'Update sparepart materials'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.materials.update');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.materials.delete', 'Delete sparepart materials'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.materials.delete');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.materials.import', 'Import sparepart materials'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.materials.import');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.materials.export', 'Export sparepart materials'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.materials.export');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.materials.template', 'Download sparepart import template'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.materials.template');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.locations.manage', 'Manage sparepart storage locations'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.locations.manage');

-- Migrate roles that already had document post/reverse → grant related read/stock/materials read
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code IN ('sparepart.document.post', 'sparepart.document.reverse')
JOIN `access_permissions` p_new ON p_new.code IN (
  'sparepart.stock.view',
  'sparepart.document.read',
  'sparepart.materials.read'
)
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Admin gets every permission
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `access_roles` r
CROSS JOIN `access_permissions` p
WHERE r.name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM `access_role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
