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

const endState = db.prepare(
  `UPDATE reception SET state='ended' WHERE guild_id=? AND state='running'`
);

const resetState = db.prepare(`
  UPDATE reception SET state='off', category_id=NULL WHERE guild_id=?
`);

export function getReception(guildId) {
  return selectReception.get(guildId) ?? null;
}

export function startReception(guildId, { year, categoryId }) {
  updateReception.run(guildId, 'running', year, categoryId, Date.now());
}

export function endReception(guildId) {
  endState.run(guildId);
}

export function resetReception(guildId) {
  resetState.run(guildId);
}
