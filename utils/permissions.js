import { logWarn } from './log.js';
import { getSetting } from '../db/settings.js';
import { SERVER_ADMIN_ROLES_KEY } from '../db/keys.js';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

export const ADMIN_PERMISSION = PermissionFlagsBits.ManageGuild;

function hasListedRole(interaction, key) {
  const roleIds = getSetting(interaction.guildId, key, []);
  return roleIds.some((roleId) => interaction.member.roles.cache.has(roleId));
}

export async function requireAllowedRole(interaction, featureKey) {
  const allowed =
    interaction.memberPermissions.has(ADMIN_PERMISSION) ||
    hasListedRole(interaction, SERVER_ADMIN_ROLES_KEY) ||
    (featureKey ? hasListedRole(interaction, featureKey) : false);

  if (!allowed) {
    logWarn(
      `${interaction.user.tag} (${interaction.user.id}) was refused, needs ${featureKey ?? SERVER_ADMIN_ROLES_KEY}.`
    );
    await interaction.reply({
      content: '⛔ You do not have permission to run this command.',
      flags: MessageFlags.Ephemeral,
    });
  }
  return allowed;
}
