-- Rename ASSEMBLY category Chinese label: 组装 → 管道
-- Prefer: node --env-file=.env.local db/run-migrations.mjs

UPDATE `sparepart_categories`
SET `name_cn` = '管道'
WHERE UPPER(`code`) IN ('ASM', 'ASSEMBLY');
