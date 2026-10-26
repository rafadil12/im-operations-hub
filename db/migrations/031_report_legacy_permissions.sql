-- Retire pre-024 report permission codes; map role grants to the current catalog.
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'report.summary.view'
JOIN `access_permissions` p_new ON p_new.code = 'report.overview.view'
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'report.weekly.read'
JOIN `access_permissions` p_new ON p_new.code = 'report.line.read'
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

INSERT INTO `access_role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p_new.id
FROM `access_role_permissions` rp
JOIN `access_permissions` p_old ON p_old.id = rp.permission_id
  AND p_old.code = 'report.weekly.submit'
JOIN `access_permissions` p_new ON p_new.code = 'report.submission.submit'
WHERE NOT EXISTS (
  SELECT 1 FROM `access_role_permissions` x
  WHERE x.role_id = rp.role_id AND x.permission_id = p_new.id
);

DELETE rp FROM `access_role_permissions` rp
JOIN `access_permissions` p ON p.id = rp.permission_id
WHERE p.code IN (
  'report.summary.view',
  'report.weekly.read',
  'report.weekly.submit'
);

DELETE FROM `access_permissions`
WHERE `code` IN (
  'report.summary.view',
  'report.weekly.read',
  'report.weekly.submit'
);
