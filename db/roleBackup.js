import db from './index.js';

const countOpen = db.prepare(`
  SELECT COUNT(*) AS n FROM role_backup WHERE guild_id=? AND restored_at IS NULL
`);

const saveBackup = db.prepare(`
  INSERT INTO role_backup (guild_id, role_id, primary_color, secondary_color, tertiary_color, hoist)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT (guild_id, role_id) DO UPDATE SET
    primary_color=excluded.primary_color,
    secondary_color=excluded.secondary_color,
    tertiary_color=excluded.tertiary_color,
    hoist=excluded.hoist,
    stripped_at=NULL,
    restored_at=NULL
`);

const markStripped = db.prepare(
  'UPDATE role_backup SET stripped_at=? WHERE guild_id=? AND role_id=?'
);

export function hasOpenBackups(guildId) {
  return countOpen.get(guildId).n > 0;
}

export function saveRoleBackup(guildId, role) {
  saveBackup.run(
    guildId,
    role.id,
    role.colors.primaryColor,
    role.colors.secondaryColor,
    role.colors.tertiaryColor,
    role.hoist ? 1 : 0
  );
}

export function markRoleStripped(guildId, roleId) {
  markStripped.run(Date.now(), guildId, roleId);
}
