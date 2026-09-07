import db from './index.js';

export const ROLE_SLUGS = ['nollan', 'ingen', 'mux', 'fadder', 'doq'];

export const ROLE_LABELS = {
  nollan: 'nØllan',
  ingen: 'INGEN & NÅGON',
  mux: 'MUX',
  fadder: 'Fadder',
  doq: 'Doq',
};

const getRole = db.prepare(
  'SELECT slug, role_id, name, primary_color, secondary_color, tertiary_color FROM reception_roles WHERE guild_id=?'
);

const updateRoleId = db.prepare(`
  INSERT INTO reception_roles (guild_id, slug, role_id)
  VALUES (?, ?, ?)
  ON CONFLICT (guild_id, slug) DO UPDATE SET role_id=excluded.role_id
`);

const updateRoleAppearance = db.prepare(`
  INSERT INTO reception_roles (guild_id, slug, name, primary_color, secondary_color, tertiary_color)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT (guild_id, slug) DO UPDATE SET
    name = COALESCE(excluded.name, name),
    primary_color = COALESCE(excluded.primary_color, primary_color),
    secondary_color = COALESCE(excluded.secondary_color, secondary_color),
    tertiary_color = COALESCE(excluded.tertiary_color, tertiary_color)
`);

export function getReceptionRoles(guildId) {
  const roles = getRole.all(guildId);
  const pairs = roles.map((role) => [role.slug, role]);
  return Object.fromEntries(pairs);
}

export function setReceptionRoleId(guildId, slug, roleId) {
  updateRoleId.run(guildId, slug, roleId);
}

export function setReceptionRoleAppearance(
  guildId,
  slug,
  { name, colors = {} }
) {
  updateRoleAppearance.run(
    guildId,
    slug,
    name ?? null,
    colors.primaryColor ?? null,
    colors.secondaryColor ?? null,
    colors.tertiaryColor ?? null
  );
}
