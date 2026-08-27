-- Training: category ENUM → divisions FK; bilingual topic + participant names.
-- Idempotent-ish (safe to re-run column checks manually). Prefer:
--   node --env-file=.env.local db/run-migrations.mjs

-- ── training_sessions: division_id ──────────────────────────────────────────
ALTER TABLE `training_sessions`
  ADD COLUMN `division_id` INT NULL AFTER `session_date`;

UPDATE `training_sessions` ts
JOIN `divisions` d ON (
  (ts.category = 'mes' AND d.name_en = 'MES')
  OR (ts.category = 'intelligent' AND d.name_en = 'Intelligent Logistics')
  OR (ts.category = 'it' AND d.name_en = 'IT')
)
SET ts.division_id = d.id
WHERE ts.division_id IS NULL;

-- Fallback: any remaining rows → first division by id
UPDATE `training_sessions`
SET `division_id` = (SELECT MIN(id) FROM `divisions`)
WHERE `division_id` IS NULL;

ALTER TABLE `training_sessions`
  MODIFY COLUMN `division_id` INT NOT NULL;

ALTER TABLE `training_sessions`
  ADD KEY `idx_training_sessions_division` (`division_id`),
  ADD KEY `idx_training_sessions_date_division` (`session_date`, `division_id`);

ALTER TABLE `training_sessions`
  ADD CONSTRAINT `fk_training_sessions_division`
    FOREIGN KEY (`division_id`) REFERENCES `divisions` (`id`);

-- Drop old category indexes + column
ALTER TABLE `training_sessions`
  DROP INDEX `idx_training_sessions_category`,
  DROP INDEX `idx_training_sessions_date_category`;

ALTER TABLE `training_sessions`
  DROP COLUMN `category`;

-- ── training_sessions: bilingual topic ──────────────────────────────────────
ALTER TABLE `training_sessions`
  ADD COLUMN `topic_en` VARCHAR(500) NULL AFTER `division_id`,
  ADD COLUMN `topic_cn` VARCHAR(500) NULL AFTER `topic_en`;

UPDATE `training_sessions`
SET
  `topic_en` = COALESCE(`topic_en`, `topic`),
  `topic_cn` = COALESCE(`topic_cn`, `topic`);

ALTER TABLE `training_sessions`
  MODIFY COLUMN `topic_en` VARCHAR(500) NOT NULL,
  MODIFY COLUMN `topic_cn` VARCHAR(500) NOT NULL;

ALTER TABLE `training_sessions`
  DROP COLUMN `topic`;

-- ── training_participants: bilingual names ──────────────────────────────────
ALTER TABLE `training_participants`
  ADD COLUMN `name_en` VARCHAR(100) NULL AFTER `id`,
  ADD COLUMN `name_cn` VARCHAR(100) NULL AFTER `name_en`;

UPDATE `training_participants`
SET
  `name_en` = COALESCE(`name_en`, `name`),
  `name_cn` = COALESCE(`name_cn`, `name`);

ALTER TABLE `training_participants`
  DROP INDEX `uk_training_participants_name`;

ALTER TABLE `training_participants`
  MODIFY COLUMN `name_en` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `name_cn` VARCHAR(100) NOT NULL;

ALTER TABLE `training_participants`
  ADD UNIQUE KEY `uk_training_participants_name_en` (`name_en`);

ALTER TABLE `training_participants`
  DROP COLUMN `name`;

-- ── training_session_participants: bilingual snapshot names ─────────────────
ALTER TABLE `training_session_participants`
  ADD COLUMN `participant_name_en` VARCHAR(100) NULL AFTER `session_id`,
  ADD COLUMN `participant_name_cn` VARCHAR(100) NULL AFTER `participant_name_en`;

UPDATE `training_session_participants`
SET
  `participant_name_en` = COALESCE(`participant_name_en`, `participant_name`),
  `participant_name_cn` = COALESCE(`participant_name_cn`, `participant_name`);

ALTER TABLE `training_session_participants`
  DROP INDEX `idx_tsp_name`;

ALTER TABLE `training_session_participants`
  MODIFY COLUMN `participant_name_en` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `participant_name_cn` VARCHAR(100) NOT NULL;

ALTER TABLE `training_session_participants`
  ADD KEY `idx_tsp_name_en` (`participant_name_en`);

ALTER TABLE `training_session_participants`
  DROP COLUMN `participant_name`;
