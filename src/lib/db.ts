import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { vegetables } from "@/data/vegetables";

const dbPath = path.join(process.cwd(), "data", "farm.sqlite");

let database: DatabaseSync | undefined;

export function getDb() {
  if (database) {
    return database;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  database = new DatabaseSync(dbPath);
  database.exec(`
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
  ensureColumn(database, "users", "is_admin", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "products", "description", "TEXT NOT NULL DEFAULT ''");
  seedProducts(database);

  return database;
}

function ensureColumn(
  db: DatabaseSync,
  table: "users" | "products",
  column: string,
  definition: string,
) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((entry) => entry.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function seedProducts(db: DatabaseSync) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO products
      (id, name, description, price_cents, unit, available, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const fillDescription = db.prepare(
    "UPDATE products SET description = ? WHERE id = ? AND description = ''",
  );

  vegetables.forEach((vegetable, index) => {
    insert.run(
      vegetable.id,
      vegetable.name,
      vegetable.description,
      vegetable.priceCents,
      vegetable.unit,
      vegetable.available ? 1 : 0,
      index,
    );
    fillDescription.run(vegetable.description, vegetable.id);
  });
}
