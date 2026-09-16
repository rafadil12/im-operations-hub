-- Restore protected `guest` role for configurable public browse (Guest Mode).
-- Guest is not assignable to login accounts.

INSERT INTO `roles` (`name`, `description`)
SELECT 'guest', 'Public browse (not logged in)'
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'guest');

UPDATE `system_users` su
INNER JOIN `roles` r ON r.id = su.role_id
SET su.role_id = NULL
WHERE r.name = 'guest';

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name = 'guest'
  AND p.code IN (
    'overview.view',
    'itsm.overview.view',
    'itsm.request.read',
    'itsm.analysis.view',
    'daily_operation.record.read',
    'daily_operation.analysis.view',
    'safety.overview.view',
    'safety.submission.read',
    'training.overview.view',
    'training.session.read',
    'report.overview.view',
    'report.line.read',
    'sparepart.overview.view',
    'sparepart.stock.view',
    'sparepart.document.read',
    'organization.overview.view',
    'organization.employee.read',
    'organization.shift.read',
    'organization.attendance.read'
  )
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
