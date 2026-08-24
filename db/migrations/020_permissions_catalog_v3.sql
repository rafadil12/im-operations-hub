-- Expand RBAC catalog: Safety module + sparepart overview.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `permissions` (`code`, `description`)
SELECT 'sparepart.overview.view', 'View sparepart overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'sparepart.overview.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'safety.overview.view', 'View safety overview dashboard'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'safety.overview.view');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'safety.submission.read', 'View safety submissions and files'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'safety.submission.read');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'safety.submission.create', 'Create safety submissions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'safety.submission.create');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'safety.submission.update', 'Update safety submissions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'safety.submission.update');

INSERT INTO `permissions` (`code`, `description`)
SELECT 'safety.submission.delete', 'Delete safety submissions'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'safety.submission.delete');

-- Backfill: roles with stock view also get sparepart overview
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `role_permissions` rp
JOIN `permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'sparepart.stock.view'
JOIN `permissions` p_new ON p_new.code = 'sparepart.overview.view'
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Viewer: sparepart overview + safety read
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code IN (
  'sparepart.overview.view',
  'safety.overview.view',
  'safety.submission.read'
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
