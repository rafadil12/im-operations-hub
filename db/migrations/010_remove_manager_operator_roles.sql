-- Remove seeded manager/operator roles. Keep admin + viewer as defaults.

-- Clear assignments for any users still on these roles
UPDATE `system_users` su
INNER JOIN `roles` r ON r.id = su.role_id
SET su.role_id = NULL
WHERE r.name IN ('manager', 'operator');

-- Drop permission links then the roles
DELETE rp FROM `role_permissions` rp
INNER JOIN `roles` r ON r.id = rp.role_id
WHERE r.name IN ('manager', 'operator');

DELETE FROM `roles` WHERE `name` IN ('manager', 'operator');
