-- Seed default organization positions (idempotent).
-- Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'General Manager', '总经理', NULL
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM positions p
  WHERE p.name_en = 'General Manager' AND p.division_id IS NULL
);

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'IT Staff', 'IT员工', d.id
FROM divisions d
WHERE d.name_en = 'IT'
  AND NOT EXISTS (
    SELECT 1 FROM positions p
    WHERE p.name_en = 'IT Staff' AND p.division_id = d.id
  )
LIMIT 1;

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'IT Technician', 'IT技术员', d.id
FROM divisions d
WHERE d.name_en = 'IT'
  AND NOT EXISTS (
    SELECT 1 FROM positions p
    WHERE p.name_en = 'IT Technician' AND p.division_id = d.id
  )
LIMIT 1;

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'MES Staff', 'MES员工', d.id
FROM divisions d
WHERE d.name_en = 'MES'
  AND NOT EXISTS (
    SELECT 1 FROM positions p
    WHERE p.name_en = 'MES Staff' AND p.division_id = d.id
  )
LIMIT 1;

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'MES Technician', 'MES技术员', d.id
FROM divisions d
WHERE d.name_en = 'MES'
  AND NOT EXISTS (
    SELECT 1 FROM positions p
    WHERE p.name_en = 'MES Technician' AND p.division_id = d.id
  )
LIMIT 1;

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'Intelligent Logistics Staff', '智能物流员工', d.id
FROM divisions d
WHERE d.name_en = 'Intelligent Logistics'
  AND NOT EXISTS (
    SELECT 1 FROM positions p
    WHERE p.name_en = 'Intelligent Logistics Staff' AND p.division_id = d.id
  )
LIMIT 1;

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'Intelligent Logistics Technician', '智能物流技术员', d.id
FROM divisions d
WHERE d.name_en = 'Intelligent Logistics'
  AND NOT EXISTS (
    SELECT 1 FROM positions p
    WHERE p.name_en = 'Intelligent Logistics Technician' AND p.division_id = d.id
  )
LIMIT 1;
