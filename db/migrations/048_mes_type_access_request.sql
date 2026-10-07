-- Rename Daily Operation mes_type EN label: Request → Access Request.
-- CN (权限申请) is unchanged. Prefer:
--   node --env-file=.env.development.local db/run-migrations.mjs
--
-- Exact match on name_en = 'Request' so "Change Request" is not affected.

UPDATE `mes_type`
SET `name_en` = 'Access Request'
WHERE `name_en` = 'Request';
