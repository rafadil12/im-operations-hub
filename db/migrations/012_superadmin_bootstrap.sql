-- Bootstrap Super Admin role + HR user + login account (idempotent).
-- Prefer running via: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO `roles` (`name`, `description`)
SELECT 'superadmin', 'System super administrator (historical / bootstrap actor)'
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'superadmin');

-- Mirror all permissions from admin (or every permission if admin missing)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r_sa.id, p.id
FROM `roles` r_sa
CROSS JOIN `permissions` p
WHERE r_sa.name = 'superadmin'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` rp
    WHERE rp.role_id = r_sa.id AND rp.permission_id = p.id
  );

-- HR person row used by system_users.user_id FK
INSERT INTO `users` (`employee_no`, `name_cn`, `name_en`, `division_id`)
SELECT 'SUPERADMIN', '超级管理员', 'Super Admin', NULL
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `employee_no` = 'SUPERADMIN');

-- Login account (same bcrypt hash as local documented test password)
INSERT INTO `system_users` (`user_id`, `password_hash`, `is_active`, `role_id`, `session_version`)
SELECT u.id,
       '$2b$12$cI4pxfYd4Rl7BCh28HcnJOjYPSgw2e83P4xhntednum009ojIEp/W',
       1,
       r.id,
       1
FROM `users` u
JOIN `roles` r ON r.name = 'superadmin'
WHERE u.employee_no = 'SUPERADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM `system_users` su WHERE su.user_id = u.id
  );

-- Keep role assignment in sync if account already existed
UPDATE `system_users` su
JOIN `users` u ON u.id = su.user_id
JOIN `roles` r ON r.name = 'superadmin'
SET su.role_id = r.id,
    su.is_active = 1
WHERE u.employee_no = 'SUPERADMIN';
