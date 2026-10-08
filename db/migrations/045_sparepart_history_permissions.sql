-- Sparepart movement history permissions (separate from document.read).
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.history.read', 'View sparepart movement history'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.history.read');

INSERT INTO `access_permissions` (`code`, `description`)
SELECT 'sparepart.history.export', 'Export sparepart movement history'
WHERE NOT EXISTS (SELECT 1 FROM `access_permissions` WHERE `code` = 'sparepart.history.export');

-- Roles that already had document.read keep History read.
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'sparepart.document.read'
JOIN `access_permissions` p_new ON p_new.code = 'sparepart.history.read'
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Same roles keep History export, except guest (read/view only).
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_roles` r ON r.id = rp.role_id AND r.name <> 'guest'
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'sparepart.document.read'
JOIN `access_permissions` p_new ON p_new.code = 'sparepart.history.export'
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

-- Guest: ensure history read (covers guest without document.read edge case).
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `access_roles` r
CROSS JOIN `access_permissions` p
WHERE r.name = 'guest'
  AND p.code = 'sparepart.history.read'
  AND NOT EXISTS (
    SELECT 1 FROM `access_role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Admin / superadmin get every permission (covers new history codes).
INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `access_roles` r
CROSS JOIN `access_permissions` p
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (
    SELECT 1 FROM `access_role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
