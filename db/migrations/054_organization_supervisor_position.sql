-- Seed the department Supervisor position (idempotent).
-- Prefer: node --env-file=.env.local db/run-migrations.mjs

INSERT INTO positions (name_en, name_cn, division_id)
SELECT 'Supervisor', '导师', NULL
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM positions p
  WHERE p.name_en = 'Supervisor' AND p.division_id IS NULL
);
