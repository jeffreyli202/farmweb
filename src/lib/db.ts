import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";
import { vegetables } from "@/data/vegetables";

let client: Client | undefined;
let ready: Promise<void> | undefined;

function getClient() {
  if (client) {
    return client;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.");
  }

  client = createClient({ url, authToken });
  ready = migrate(client);
  return client;
}

async function readyDb() {
  getClient();
  await ready;
}

function rowsOf<T>(result: ResultSet): T[] {
  return result.rows.map((row) => {
    const plain: Record<string, unknown> = {};
    result.columns.forEach((column, index) => {
      const value = row[index];
      plain[column] = typeof value === "bigint" ? Number(value) : value;
    });
    return plain as T;
  });
}

export async function dbAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await readyDb();
  const result = await getClient().execute({ sql, args });
  return rowsOf<T>(result);
}

export async function dbGet<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, args);
  return rows[0];
}

export async function dbRun(sql: string, args: InValue[] = []) {
  await readyDb();
  const result = await getClient().execute({ sql, args });
  return {
    changes: result.rowsAffected,
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
  };
}

type DbStatement = {
  get<T>(sql: string, args?: InValue[]): Promise<T | undefined>;
  run(sql: string, args?: InValue[]): Promise<{ changes: number; lastInsertRowid: number }>;
};

export async function dbWrite<T>(run: (tx: DbStatement) => Promise<T>): Promise<T> {
  await readyDb();
  const tx = await getClient().transaction("write");
  try {
    const value = await run({
      async get<T>(sql: string, args: InValue[] = []) {
        const result = await tx.execute({ sql, args });
        return rowsOf<T>(result)[0];
      },
      async run(sql: string, args: InValue[] = []) {
        const result = await tx.execute({ sql, args });
        return {
          changes: result.rowsAffected,
          lastInsertRowid: Number(result.lastInsertRowid ?? 0),
        };
      },
    });
    await tx.commit();
    return value;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

async function migrate(database: Client) {
  await database.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      verified_at TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price_cents INTEGER NOT NULL,
      unit TEXT NOT NULL,
      available INTEGER NOT NULL,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid',
      stripe_session_id TEXT,
      receipt_sent_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_cents INTEGER NOT NULL
    );
  `);

  await ensureColumn(database, "users", "is_admin", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(database, "products", "description", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(database, "orders", "status", "TEXT NOT NULL DEFAULT 'unpaid'");
  await ensureColumn(database, "orders", "stripe_session_id", "TEXT");
  await ensureColumn(database, "orders", "receipt_sent_at", "TEXT");
  await seedProducts(database);
}

async function ensureColumn(
  database: Client,
  table: "users" | "products" | "orders",
  column: string,
  definition: string,
) {
  const info = await database.execute(`PRAGMA table_info(${table})`);
  const names = rowsOf<{ name: string }>(info).map((entry) => entry.name);
  if (names.includes(column)) {
    return;
  }
  await database.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function seedProducts(database: Client) {
  for (const [index, vegetable] of vegetables.entries()) {
    await database.execute({
      sql: `INSERT OR IGNORE INTO products
        (id, name, description, price_cents, unit, available, position)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        vegetable.id,
        vegetable.name,
        vegetable.description,
        vegetable.priceCents,
        vegetable.unit,
        vegetable.available ? 1 : 0,
        index,
      ],
    });
    await database.execute({
      sql: "UPDATE products SET description = ? WHERE id = ? AND description = ''",
      args: [vegetable.description, vegetable.id],
    });
  }
}
