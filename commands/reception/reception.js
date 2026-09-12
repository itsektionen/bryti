import {
  InteractionContextType,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import {
  getReception,
  startReception,
  endReception,
} from '../../db/reception.js';
import {
  hasOpenBackups,
  saveRoleBackup,
  markRoleStripped,
  getOpenBackups,
  markRoleRestored,
} from '../../db/roleBackup.js';
import {
  ROLE_SLUGS,
  ROLE_LABELS,
  getReceptionRoles,
} from '../../db/receptionRoles.js';
import {
  MAX_CHANNELS,
  MAX_CHANNELS_PER_CATEGORY,
  MAX_ROLES,
} from '../../utils/discordCaps.js';
import {
  saveReceptionGroup,
  getReceptionGroups,
} from '../../db/receptionGroups.js';
import { runLimited } from '../../utils/runLimited.js';
import { ephemeralMessage } from '../../utils/messages.js';
import { RECEPTION_ADMIN_ROLES_KEY } from '../../db/keys.js';
import { requireAllowedRole } from '../../utils/permissions.js';

function parseGroups(raw) {
  return raw
    .split(/[\s,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

async function handleSetup(interaction) {
  if (!(await requireAllowedRole(interaction, RECEPTION_ADMIN_ROLES_KEY))) {
    return;
  }

  const { guild, guildId } = interaction;
  const reason = `Reception setup by ${interaction.user.tag}`;

  const current = getReception(guildId);
  if (current?.state === 'running') {
    await interaction.reply(
      ephemeralMessage(
        'Reception is already running. Run `/reception end` first.'
      )
    );
    return;
  }
  if (hasOpenBackups(guildId)) {
    await interaction.reply(
      ephemeralMessage(
        'Some roles are still stripped from a past run. Run `/reception end` before starting a new one.'
      )
    );
    return;
  }

  const roles = getReceptionRoles(guildId);
  const missing = ROLE_SLUGS.filter((slug) => !roles[slug]?.role_id);
  if (missing.length > 0) {
    const names = missing.map((slug) => ROLE_LABELS[slug]).join(', ');
    await interaction.reply(
      ephemeralMessage(
        `These reception roles are not set: ${names}. Set them with \`/receptionconfig roles\`.`
      )
    );
    return;
  }
  const roleId = Object.fromEntries(
    ROLE_SLUGS.map((slug) => [slug, roles[slug].role_id])
  );

  const groupNames = parseGroups(interaction.options.getString('groups'));
  if (groupNames.length === 0) {
    await interaction.reply(
      ephemeralMessage('Give at least one nØllegroup name.')
    );
    return;
  }

  const newChannels = 3 + groupNames.length;
  if (guild.roles.cache.size + groupNames.length > MAX_ROLES) {
    await interaction.reply(
      ephemeralMessage(
        `That would pass the ${MAX_ROLES} role limit. Roles need to be removed to continue.`
      )
    );
    return;
  }
  if (guild.channels.cache.size + newChannels > MAX_CHANNELS) {
    await interaction.reply(
      ephemeralMessage(
        `That would pass the ${MAX_CHANNELS} channel limit. Channels need to be deleted to continue.`
      )
    );
    return;
  }
  if (2 + groupNames.length > MAX_CHANNELS_PER_CATEGORY) {
    await interaction.reply(
      ephemeralMessage(
        `That would pass the ${MAX_CHANNELS_PER_CATEGORY} channels per category limit.`
      )
    );
    return;
  }

  const year = new Date().getFullYear();

  await interaction.deferReply();

  const groupRoles = new Map();
  for (const name of groupNames) {
    const role = await guild.roles.create({
      name,
      mentionable: true,
      permissions: [],
      reason,
    });
    groupRoles.set(name, role);
  }

  const everyone = guild.roles.everyone;
  const me = guild.members.me;

  const category = await guild.channels.create({
    name: `Reception ${year}`,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      ...ROLE_SLUGS.map((slug) => ({
        id: roleId[slug],
        allow: [PermissionFlagsBits.ViewChannel],
      })),
    ],
    reason,
  });

  await guild.channels.create({
    name: 'announcements',
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: everyone,
        deny: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
      ...['nollan', 'fadder', 'doq'].map((slug) => ({
        id: roleId[slug],
        allow: [PermissionFlagsBits.ViewChannel],
      })),
      ...['ingen', 'mux'].map((slug) => ({
        id: roleId[slug],
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      })),
    ],
    reason,
  });

  await guild.channels.create({
    name: 'general',
    type: ChannelType.GuildText,
    parent: category.id,
    reason,
  });

  for (const name of groupNames) {
    const role = groupRoles.get(name);
    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: roleId.ingen, allow: [PermissionFlagsBits.ViewChannel] },
        { id: roleId.mux, allow: [PermissionFlagsBits.ViewChannel] },
        { id: role.id, allow: [PermissionFlagsBits.ViewChannel] },
      ],
      reason,
    });
    saveReceptionGroup(guildId, {
      name,
      roleId: role.id,
      channelId: channel.id,
    });
  }

  const keep = new Set([
    ...Object.values(roleId),
    ...[...groupRoles.values()].map((role) => role.id),
  ]);
  const targets = guild.roles.cache.filter(
    (role) =>
      role.editable &&
      !role.managed &&
      role.id !== guild.id &&
      !keep.has(role.id)
  );

  for (const role of targets.values()) {
    saveRoleBackup(guildId, role);
  }

  await runLimited([...targets.values()], 3, async (role) => {
    await role.edit({
      colors: { primaryColor: 0, secondaryColor: null, tertiaryColor: null },
      hoist: false,
      reason,
    });
    markRoleStripped(guildId, role.id);
  });

  startReception(guildId, { year, categoryId: category.id });

  await interaction.editReply(
    `✅ Reception ${year} is set up. Created ${groupNames.length} nØllegroup${groupNames.length > 1 ? 's' : ''} and stripped ${targets.size} role${targets.size === 1 ? '' : 's'}.`
  );
}

async function handleArchive(interaction) {
  if (!(await requireAllowedRole(interaction, RECEPTION_ADMIN_ROLES_KEY))) {
    return;
  }

  const { guild, guildId } = interaction;
  const reason = `Reception archive by ${interaction.user.tag}`;

  const reception = getReception(guildId);
  if (!reception?.category_id) {
    await interaction.reply(
      ephemeralMessage('No reception is set up. Run `/reception setup` first.')
    );
    return;
  }

  const archiveOption = interaction.options.getChannel('archive');
  if (archiveOption.type !== ChannelType.GuildCategory) {
    await interaction.reply(
      ephemeralMessage('Pick a category for the archive.')
    );
    return;
  }

  await interaction.deferReply();

  const archiveCategory = await guild.channels.fetch(archiveOption.id);
  const receptionCategory = await guild.channels.fetch(reception.category_id);
  if (!receptionCategory) {
    await interaction.editReply('The reception category is already removed.');
    return;
  }

  const year = reception.year ?? new Date().getFullYear();
  const prefix = `Ø${year.toString().slice(-2)}-`;
  const children = guild.channels.cache.filter(
    (channel) => channel.parentId === receptionCategory.id
  );
  for (const channel of children.values()) {
    await channel.setParent(archiveCategory.id, { lockPermissions: true });
    await channel.setName(`${prefix}${channel.name}`);
  }

  await receptionCategory.delete(reason);

  for (const group of getReceptionGroups(guildId)) {
    const role = guild.roles.cache.get(group.role_id);
    if (role) {
      await role.delete(reason);
    }
  }

  await interaction.editReply(
    `✅ Archived reception ${year}. Moved ${children.size} channel${children.size === 1 ? '' : 's'} and removed the nØllegroup roles.`
  );
}

async function handleEnd(interaction) {
  if (!(await requireAllowedRole(interaction, RECEPTION_ADMIN_ROLES_KEY))) {
    return;
  }

  const { guild, guildId } = interaction;
  const reason = `Reception end by ${interaction.user.tag}`;

  const openBackups = getOpenBackups(guildId);
  if (openBackups.length === 0) {
    await interaction.reply(
      ephemeralMessage('No roles are waiting to be restored.')
    );
    return;
  }

  await interaction.deferReply();

  const restored = [];
  let skipped = 0;
  await runLimited(openBackups, 3, async (row) => {
    const role = guild.roles.cache.get(row.role_id);
    if (!role) {
      skipped++;
      return;
    }
    await role.edit({
      colors: {
        primaryColor: row.primary_color ?? 0,
        secondaryColor: row.secondary_color,
        tertiaryColor: row.tertiary_color,
      },
      hoist: row.hoist === 1,
      reason,
    });
    markRoleRestored(guildId, role.id);
    restored.push(role);
  });

  endReception(guildId);

  const mentions = restored.map((role) => `<@&${role.id}>`).join(', ');
  const restoredNote =
    restored.length > 0 && mentions.length <= 1000 ? `: ${mentions}` : '.';
  const skippedNote =
    skipped > 0
      ? `\nSkipped ${skipped} deleted role${skipped === 1 ? '' : 's'}.`
      : '';
  const clearHint =
    '\nℹ️ Run `/reception clear target:nollan` to remove everyone from the nØllan role so they can access the rest of the server.';
  await interaction.editReply(
    ephemeralMessage(
      `✅ Restored ${restored.length} role${restored.length === 1 ? '' : 's'}${restoredNote}${skippedNote}${clearHint}`
    )
  );
}

async function handleStatus(interaction) {
  const reception = getReception(interaction.guildId);
  if (!reception) {
    await interaction.reply(
      ephemeralMessage('Reception was never set up here.')
    );
    return;
  }

  const open = getOpenBackups(interaction.guildId).length;
  await interaction.reply(
    ephemeralMessage(
      `State: ${reception.state}\nYear: ${reception.year}\n${open} role${open === 1 ? '' : 's'} still waiting to be restored.`
    )
  );
}

async function handleClear(interaction) {
  if (!(await requireAllowedRole(interaction, RECEPTION_ADMIN_ROLES_KEY))) {
    return;
  }

  const { guild, guildId } = interaction;
  const reason = `Reception clear by ${interaction.user.tag}`;
  const target = interaction.options.getString('target');

  const roles = getReceptionRoles(guildId);
  const slugId = (slug) => roles[slug]?.role_id;
  const roleIds = (
    target === 'all'
      ? [
          slugId('nollan'),
          slugId('ingen'),
          slugId('mux'),
          slugId('fadder'),
          slugId('doq'),
        ]
      : [slugId(target)]
  ).filter(Boolean);

  if (roleIds.length === 0) {
    await interaction.reply(
      ephemeralMessage('Nothing is configured for that role.')
    );
    return;
  }

  await interaction.deferReply();
  await guild.members.fetch();

  let removed = 0;
  const cleared = [];
  for (const roleId of roleIds) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      continue;
    }
    cleared.push(role);
    await runLimited([...role.members.values()], 3, async (member) => {
      await member.roles.remove(role, reason);
      removed++;
    });
  }

  const mentions = cleared.map((role) => `<@&${role.id}>`).join(', ');
  await interaction.editReply(
    ephemeralMessage(
      `✅ Removed ${mentions} from ${removed} member${removed === 1 ? '' : 's'}.`
    )
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('reception')
    .setDescription('Runs the yearly reception.')
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((command) =>
      command
        .setName('setup')
        .setDescription(
          'Create reception roles and channels, strip other roles.'
        )
        .addStringOption((option) =>
          option
            .setName('groups')
            .setDescription('nØllegroup names, separated by comma.')
            .setRequired(true)
            .setMinLength(2)
        )
    )
    .addSubcommand((command) =>
      command
        .setName('end')
        .setDescription('Restore every stripped role to its saved appearance.')
    )
    .addSubcommand((command) =>
      command
        .setName('status')
        .setDescription('Show the reception state and roles left to restore.')
    )
    .addSubcommand((command) =>
      command
        .setName('clear')
        .setDescription('Remove all members from a reception role.')
        .addStringOption((option) =>
          option
            .setName('target')
            .setDescription('Which role to clear.')
            .setRequired(true)
            .addChoices(
              { name: 'nØllan', value: 'nollan' },
              { name: 'INGEN & NÅGON', value: 'ingen' },
              { name: 'MUX', value: 'mux' },
              { name: 'Fadder', value: 'fadder' },
              { name: 'Doq', value: 'doq' },
              { name: 'All', value: 'all' }
            )
        )
    )
    .addSubcommand((command) =>
      command
        .setName('archive')
        .setDescription(
          'Move reception channels to an archive and delete nØllegroup roles.'
        )
        .addChannelOption((option) =>
          option
            .setName('archive')
            .setDescription('The category to move the channels into.')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const handler = {
      setup: handleSetup,
      end: handleEnd,
      status: handleStatus,
      clear: handleClear,
      archive: handleArchive,
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
