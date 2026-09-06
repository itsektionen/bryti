import db from './index.js';
import { randomBytes } from 'node:crypto';

const DEFAULT_TTL_MS = 15 * 60 * 1000;

const insert = db.prepare(
  'INSERT INTO pending (id, kind, payload_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
);
const selectById = db.prepare('SELECT * FROM pending WHERE id = ?');
const deleteById = db.prepare('DELETE FROM pending WHERE id = ?');
const deleteExpired = db.prepare('DELETE FROM pending WHERE expires_at <= ?');

export function createPending(kind, payload, ttlMs = DEFAULT_TTL_MS) {
  const id = randomBytes(8).toString('hex');
  const now = Date.now();
  insert.run(id, kind, JSON.stringify(payload), now, now + ttlMs);
  return id;
}

export function readPending(id, kind) {
  const row = selectById.get(id);
  if (!row || row.kind !== kind) return null;
  if (row.expires_at <= Date.now()) {
    deleteById.run(id);
    return null;
  }
  return JSON.parse(row.payload_json);
}

export function deletePending(id) {
  deleteById.run(id);
}

export function purgeExpiredPending() {
  return deleteExpired.run(Date.now()).changes;
}
