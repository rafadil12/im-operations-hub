-- Remove seeded viewer role. Public browse uses the guest role; login roles are custom.

UPDATE `system_users` su
INNER JOIN `access_roles` r ON r.id = su.role_id
SET su.role_id = NULL
WHERE r.name = 'viewer';

DELETE rp FROM `access_role_permissions` rp
INNER JOIN `access_roles` r ON r.id = rp.role_id
WHERE r.name = 'viewer';

DELETE FROM `access_roles` WHERE `name` = 'viewer';
