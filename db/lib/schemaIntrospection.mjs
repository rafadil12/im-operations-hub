/**
 * information_schema helpers for idempotent migration guards.
 * @param {import("mysql2/promise").Connection} conn
 * @param {string} dbName
 */
export function createSchemaIntrospection(conn, dbName) {
  async function columnExists(table, column) {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, column],
    );
    return rows.length > 0;
  }

  async function columnType(table, column) {
    const [rows] = await conn.query(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, column],
    );
    return rows[0]?.DATA_TYPE?.toLowerCase() ?? null;
  }

  async function columnLength(table, column) {
    const [rows] = await conn.query(
      `SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, column],
    );
    return Number(rows[0]?.CHARACTER_MAXIMUM_LENGTH ?? 0);
  }

  async function tableExists(table) {
    const [rows] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [dbName, table],
    );
    return rows.length > 0;
  }

  async function indexExists(table, indexName) {
    const [rows] = await conn.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [dbName, table, indexName],
    );
    return rows.length > 0;
  }

  async function constraintExists(table, name) {
    const [rows] = await conn.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
      [dbName, table, name],
    );
    return rows.length > 0;
  }

  async function columnNullable(table, column) {
    const [rows] = await conn.query(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, column],
    );
    return rows[0]?.IS_NULLABLE === "YES";
  }

  return {
    columnExists,
    columnType,
    columnLength,
    tableExists,
    indexExists,
    constraintExists,
    columnNullable,
  };
}
