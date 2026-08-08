-- Remove redundant `guest` role. Guest Mode is the default unauthenticated state.

-- Clear role assignment for any users still on guest
UPDATE `system_users` su
INNER JOIN `roles` r ON r.id = su.role_id
SET su.role_id = NULL
WHERE r.name = 'guest';

-- Drop permission links then the role itself
DELETE rp FROM `role_permissions` rp
INNER JOIN `roles` r ON r.id = rp.role_id
WHERE r.name = 'guest';

DELETE FROM `roles` WHERE `name` = 'guest';
