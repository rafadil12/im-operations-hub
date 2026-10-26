-- Drop legacy unused tables. App uses daily_operation_record and safety_submission_files.
-- Prefer: node --env-file=.env.development.local db/run-migrations.mjs

DROP TABLE IF EXISTS `mes_data`;
DROP TABLE IF EXISTS `safety_files`;
