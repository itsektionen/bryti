import {
  SERVER_ADMIN_ROLES_KEY,
  RECEPTION_ADMIN_ROLES_KEY,
} from '../../db/keys.js';
import { ephemeralMessage } from '../../utils/messages.js';
import { getSetting, setSetting } from '../../db/settings.js';
import { ADMIN_PERMISSION } from '../../utils/permissions.js';
import { InteractionContextType, SlashCommandBuilder } from 'discord.js';

const SCOPE_KEYS = {
  server: SERVER_ADMIN_ROLES_KEY,
  reception: RECEPTION_ADMIN_ROLES_KEY,
};

const SCOPE_LABELS = {
  server: 'Server Admins',
  reception: 'Reception Admins',
};

const scopeChoices = Object.keys(SCOPE_KEYS).map((scope) => ({
  name: SCOPE_LABELS[scope],
  value: scope,
}));

async function handleAdmin(interaction) {
  const scope = interaction.options.getString('scope');
  const role = interaction.options.getRole('role');
  const key = SCOPE_KEYS[scope];
  const roleIds = getSetting(interaction.guildId, key, []);

  if (interaction.options.getString('action') === 'add') {
    if (roleIds.includes(role.id)) {
      await interaction.reply(
        ephemeralMessage(
          `<@&${role.id}> is already a ${SCOPE_LABELS[scope]} role.`
        )
      );
      return;
    }
    roleIds.push(role.id);
    setSetting(interaction.guildId, key, roleIds);
    await interaction.reply(
      ephemeralMessage(`Added <@&${role.id}> to ${SCOPE_LABELS[scope]}.`)
    );
    return;
  }

  if (!roleIds.includes(role.id)) {
    await interaction.reply(
      ephemeralMessage(`<@&${role.id}> is not a ${SCOPE_LABELS[scope]} role.`)
    );
    return;
  }
  const next = roleIds.filter((roleId) => roleId !== role.id);
  setSetting(interaction.guildId, key, next);
  await interaction.reply(
    ephemeralMessage(`Removed <@&${role.id}> from ${SCOPE_LABELS[scope]}.`)
  );
}

async function handleShow(interaction) {
  const lines = Object.keys(SCOPE_KEYS).map((scope) => {
    const roleIds = getSetting(interaction.guildId, SCOPE_KEYS[scope], []);
    const roles =
      roleIds.length > 0
        ? roleIds.map((roleId) => `<@&${roleId}>`).join(', ')
        : '*none*';
    return `- ${SCOPE_LABELS[scope]}: ${roles}`;
  });

  await interaction.reply(ephemeralMessage(lines.join('\n')));
}

export default {
  data: new SlashCommandBuilder()
    .setName('botconfig')
    .setDescription('Sets up who may use the bot.')
    .setDefaultMemberPermissions(ADMIN_PERMISSION)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((command) =>
      command
        .setName('admin')
        .setDescription('Add or remove a role from an admin list.')
        .addStringOption((option) =>
          option
            .setName('scope')
            .setDescription('Which admin list to change.')
            .setRequired(true)
            .addChoices(...scopeChoices)
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Add or remove the role.')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' }
            )
        )
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('The role to add or remove.')
            .setRequired(true)
        )
    )
    .addSubcommand((command) =>
      command.setName('show').setDescription('Show the current admin lists.')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const handler = {
      admin: handleAdmin,
      show: handleShow,
    }[subcommand];

    if (!handler) {
      await interaction.reply(
        ephemeralMessage(`Unknown subcommand \`${subcommand}\`.`)
      );
      return;
    }

    await handler(interaction);
  },
};
