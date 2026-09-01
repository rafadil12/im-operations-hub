/**
 * Ensure superadmin role has roles.id = 1 (swap with admin when needed).
 * @param {import("mysql2/promise").Connection} conn
 */
export async function migrateSuperadminRoleId(conn) {
  const [[sa]] = await conn.query(
    `SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1`,
  );
  const [[adm]] = await conn.query(
    `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`,
  );
  if (!sa) {
    console.log("Skip 013: superadmin role missing.");
  } else if (Number(sa.id) === 1) {
    console.log("superadmin already roles.id=1.");
  } else if (!adm || Number(adm.id) !== 1) {
    const oldSa = Number(sa.id);
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query(`UPDATE roles SET id = 1 WHERE id = ?`, [oldSa]);
    await conn.query(`UPDATE role_permissions SET role_id = 1 WHERE role_id = ?`, [oldSa]);
    await conn.query(`UPDATE system_users SET role_id = 1 WHERE role_id = ?`, [oldSa]);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log(`Moved superadmin id ${oldSa} → 1.`);
  } else {
    const oldSa = Number(sa.id);
    const TEMP = 900001;
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query(`UPDATE roles SET id = ? WHERE id = 1`, [TEMP]);
    await conn.query(`UPDATE role_permissions SET role_id = ? WHERE role_id = 1`, [TEMP]);
    await conn.query(`UPDATE system_users SET role_id = ? WHERE role_id = 1`, [TEMP]);
    await conn.query(`UPDATE roles SET id = 1 WHERE id = ?`, [oldSa]);
    await conn.query(`UPDATE role_permissions SET role_id = 1 WHERE role_id = ?`, [oldSa]);
    await conn.query(`UPDATE system_users SET role_id = 1 WHERE role_id = ?`, [oldSa]);
    await conn.query(`UPDATE roles SET id = ? WHERE id = ?`, [oldSa, TEMP]);
    await conn.query(`UPDATE role_permissions SET role_id = ? WHERE role_id = ?`, [oldSa, TEMP]);
    await conn.query(`UPDATE system_users SET role_id = ? WHERE role_id = ?`, [oldSa, TEMP]);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log(`Swapped roles: superadmin → id=1, admin → id=${oldSa}.`);
  }

  await conn.query(
    `UPDATE system_users su
     JOIN users u ON u.id = su.user_id
     JOIN roles r ON r.name = 'superadmin'
     SET su.role_id = r.id, su.is_active = 1
     WHERE u.employee_no = 'SUPERADMIN'`,
  );
}
