import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../config/env.js';
import { migrations } from './migrations.js';

fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

const db = new Database(env.dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

function migrate() {
  const current = db.pragma('user_version', { simple: true });
  const todo = migrations
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);

  if (todo.length === 0) return;

  db.transaction(() => {
    for (const migration of todo) {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    }
  })();

  console.info(
    `Database migrated from version ${current} to ${todo.at(-1).version}.`
  );
}

migrate();

export default db;
