-- Report: reopen submitted weekly report (admin / superadmin).
-- Idempotent. Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `permissions` (`code`, `description`)
SELECT 'report.submission.reopen', 'Reopen a submitted weekly report for editing'
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'report.submission.reopen');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.code = 'report.submission.reopen'
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
