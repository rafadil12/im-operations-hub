/**
 * Shared helpers for idempotent DDL in run-migrations.mjs.
 * @param {import("mysql2/promise").Connection} conn
 */
export function createMigrationHelpers(conn) {
  async function tryAddFk(sql, label) {
    try {
      await conn.query(sql);
      console.log(`Added ${label}.`);
    } catch (err) {
      const errno = /** @type {{ errno?: number }} */ (err).errno;
      const code = /** @type {{ code?: string }} */ (err).code;
      if (
        errno === 121 ||
        errno === 1005 ||
        errno === 1826 ||
        code === "ER_DUP_KEYNAME" ||
        code === "ER_FK_DUP_NAME"
      ) {
        console.log(`${label} already present.`);
      } else {
        console.log(`Skipped ${label}: ${err.message ?? err}`);
      }
    }
  }

  async function tryAddConstraint(sql, label) {
    try {
      await conn.query(sql);
      console.log(`Added ${label}.`);
    } catch (err) {
      const code = /** @type {{ code?: string }} */ (err).code;
      if (code === "ER_DUP_KEYNAME" || code === "ER_FK_DUP_NAME" || code === "ER_CANNOT_ADD_FOREIGN") {
        console.log(`${label} already present (or skipped).`);
      } else if (String(err).includes("Duplicate") || code === "ER_DUP_FIELDNAME") {
        console.log(`${label} already present.`);
      } else {
        const errno = /** @type {{ errno?: number }} */ (err).errno;
        if (errno === 121 || errno === 1005 || errno === 1826) {
          console.log(`${label} already present.`);
        } else {
          throw err;
        }
      }
    }
  }

  async function applySqlFile(filename, readMigrationSql, logMessage) {
    await conn.query(readMigrationSql(filename));
    console.log(logMessage);
  }

  return { tryAddFk, tryAddConstraint, applySqlFile };
}
