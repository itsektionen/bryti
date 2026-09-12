import db from './index.js';

const selectGroups = db.prepare(`
  SELECT name, role_id, channel_id FROM reception_groups WHERE guild_id=?  
`);

const updateGroup = db.prepare(`
  INSERT INTO reception_groups (guild_id, name, role_id, channel_id)
  VALUES (?, ?, ?, ?)
  ON CONFLICT (guild_id, name) DO UPDATE SET
    name=excluded.name,
    role_id=excluded.role_id,
    channel_id=excluded.channel_id
`);

const deleteGroups = db.prepare(
  `DELETE FROM reception_groups WHERE guild_id=?`
);

export function getReceptionGroups(guildId) {
  return selectGroups.all(guildId);
}

export function saveReceptionGroup(guildId, { name, roleId, channelId }) {
  updateGroup.run(guildId, name, roleId, channelId);
}

export function clearReceptionGroups(guildId) {
  deleteGroups.run(guildId);
}
