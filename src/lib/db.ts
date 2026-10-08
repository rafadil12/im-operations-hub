import mysql from "mysql2/promise";
import { describeWrite, shouldSkipWrite } from "@/lib/logs-center/describeWrite";
import { persistSqlWrites } from "@/lib/logs-center/record";

declare global {
  var __mesDbPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error(
      "Database env vars missing. Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env.local"
    );
  }

  return mysql.createPool({
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: process.env.DB_POOL_SIZE ? Number(process.env.DB_POOL_SIZE) : 10,
    queueLimit: 0,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    dateStrings: true,
    charset: "utf8mb4",
  });
}

// Reuse the pool across hot reloads in development.
export const pool: mysql.Pool = global.__mesDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__mesDbPool = pool;
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

export async function execute(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.query(sql, params);
  const header = result as mysql.ResultSetHeader;
  const write = describeWrite(sql);
  if (write && !shouldSkipWrite(sql, write)) {
    await persistSqlWrites([sql]);
  }
  return header;
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  const writes: string[] = [];
  const tracked = new Proxy(conn, {
    get(target, prop, receiver) {
      if (prop === "query") {
        return (sql: unknown, ...rest: unknown[]) => {
          const result = target.query(sql as string, ...(rest as []));
          if (typeof sql === "string") {
            const write = describeWrite(sql);
            if (write && !shouldSkipWrite(sql, write) && isPromise(result)) {
              return result.then((value) => {
                writes.push(sql);
                return value;
              });
            }
          }
          return result;
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as mysql.PoolConnection;

  try {
    await conn.beginTransaction();
    const result = await fn(tracked);
    await conn.commit();
    if (writes.length > 0) await persistSqlWrites(writes);
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}
