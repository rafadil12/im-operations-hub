-- Expand RBAC catalog: Safety module + sparepart overview.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.overview.view', 'View sparepart overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.overview.view');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'safety.overview.view', 'View safety overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'safety.overview.view');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'safety.submission.read', 'View safety submissions and files'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'safety.submission.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'safety.submission.create', 'Create safety submissions'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'safety.submission.create');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'safety.submission.update', 'Update safety submissions'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'safety.submission.update');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'safety.submission.delete', 'Delete safety submissions'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'safety.submission.delete');

-- Backfill: roles with stock view also get sparepart overview
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'sparepart.stock.view'
JOIN `access_permissions` p_new ON p_new.code = 'sparepart.overview.view'
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
