import db from './index.js';

const selectValue = db.prepare(
  'SELECT value FROM settings WHERE guild_id=? AND key=?'
);

const updateValue = db.prepare(`
  INSERT INTO settings (guild_id, key, value)
  VALUES (?, ?, ?)
  ON CONFLICT (guild_id, key) DO UPDATE SET value=excluded.value
`);

const removeValue = db.prepare(
  'DELETE FROM settings where guild_id=? AND key=?'
);

export function getSetting(guildId, key, fallback = null) {
  const row = selectValue.get(guildId, key);
  if (!row) return fallback;
  return JSON.parse(row.value);
}

export function setSetting(guildId, key, value) {
  const string = JSON.stringify(value);
  updateValue.run(guildId, key, string);
}

export function deleteSetting(guildId, key) {
  removeValue.run(guildId, key);
}
