-- ASSEMBLY category CN label: 管道 → 流水线
-- Prefer: node --env-file=.env.local db/run-migrations.mjs

UPDATE `sparepart_categories`
SET `name_cn` = '流水线'
WHERE UPPER(`code`) IN ('ASM', 'ASSEMBLY')
  AND `name_cn` <> '流水线';

UPDATE `sparepart_storage_locations`
SET `name_cn` = REPLACE(`name_cn`, '管道货架', '流水线货架')
WHERE `name_cn` LIKE '%管道货架%';
