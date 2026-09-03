-- Normalize legacy report area code MOM -> MES and remove duplicate seeded MES row.
-- Legacy DBs may have id 1 code=MOM plus a migration-seeded duplicate code=MES (e.g. id 6).

-- report_lines: move rows from duplicate MES area to legacy MOM area when no conflict
UPDATE `report_lines` rl
INNER JOIN `report_areas` dup ON dup.id = rl.area_id AND dup.code = 'MES'
INNER JOIN `report_areas` canon ON canon.code = 'MOM' AND canon.id <> dup.id
LEFT JOIN `report_lines` existing
  ON existing.week_id = rl.week_id
 AND existing.area_id = canon.id
 AND existing.sub_item_id <=> rl.sub_item_id
SET rl.area_id = canon.id
WHERE existing.id IS NULL;

DELETE rl FROM `report_lines` rl
INNER JOIN `report_areas` dup ON dup.id = rl.area_id AND dup.code = 'MES'
INNER JOIN `report_areas` canon ON canon.code = 'MOM' AND canon.id <> dup.id;

-- report_week_submissions
UPDATE `report_week_submissions` rws
INNER JOIN `report_areas` dup ON dup.id = rws.area_id AND dup.code = 'MES'
INNER JOIN `report_areas` canon ON canon.code = 'MOM' AND canon.id <> dup.id
LEFT JOIN `report_week_submissions` existing
  ON existing.week_id = rws.week_id AND existing.area_id = canon.id
SET rws.area_id = canon.id
WHERE existing.id IS NULL;

DELETE rws FROM `report_week_submissions` rws
INNER JOIN `report_areas` dup ON dup.id = rws.area_id AND dup.code = 'MES'
INNER JOIN `report_areas` canon ON canon.code = 'MOM' AND canon.id <> dup.id;

-- report_sub_items
UPDATE `report_sub_items` rsi
INNER JOIN `report_areas` dup ON dup.id = rsi.area_id AND dup.code = 'MES'
INNER JOIN `report_areas` canon ON canon.code = 'MOM' AND canon.id <> dup.id
LEFT JOIN `report_sub_items` existing
  ON existing.area_id = canon.id AND existing.name_cn = rsi.name_cn
SET rsi.area_id = canon.id
WHERE existing.id IS NULL;

DELETE rsi FROM `report_sub_items` rsi
INNER JOIN `report_areas` dup ON dup.id = rsi.area_id AND dup.code = 'MES'
INNER JOIN `report_areas` canon ON canon.code = 'MOM' AND canon.id <> dup.id;

-- report_week_attachments (if present)
UPDATE `report_week_attachments` rwa
INNER JOIN `report_areas` dup ON dup.id = rwa.area_id AND dup.code = 'MES'
INNER JOIN `report_areas` canon ON canon.code = 'MOM' AND canon.id <> dup.id
SET rwa.area_id = canon.id;

-- Remove duplicate seeded MES row (keep legacy MOM row)
DELETE dup FROM `report_areas` dup
INNER JOIN `report_areas` canon ON canon.code = 'MOM'
WHERE dup.code = 'MES' AND dup.id <> canon.id;

-- Rename legacy MOM code to MES
UPDATE `report_areas` SET `code` = 'MES' WHERE `code` = 'MOM';
