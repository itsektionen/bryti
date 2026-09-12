import db from './index.js';

const selectReception = db.prepare('SELECT * FROM reception WHERE guild_id=?');

const updateReception = db.prepare(`
  INSERT INTO reception (guild_id, state, year, category_id, started_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (guild_id) DO UPDATE SET
    state=excluded.state,
    year=excluded.year,
    category_id=excluded.category_id,
    started_at=excluded.started_at
`);

export function getReception(guildId) {
  return selectReception.get(guildId) ?? null;
}

export function startReception(guildId, { year, categoryId }) {
  updateReception.run(guildId, 'running', year, categoryId, Date.now());
}
