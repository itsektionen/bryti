import { SlashCommandBuilder, ChannelType, PermissionsBitField, MessageFlags } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_ROLES = path.resolve('allowed_roles.json');
const RECEPTION_DATA = path.resolve('reception_data.json');
const ROLE_SETTINGS = path.resolve('role_settings.json');
const YEAR = new Date().getFullYear();

export default {
  data: new SlashCommandBuilder()
    .setName('setupreception')
    .setDescription('Sets up the server for reception. Adds roles, creates channels, etc.')
    .addStringOption(option =>
      option.setName("groups")
        .setDescription("Names of the nØllegroups (comma or space separated)")
        .setRequired(true)
        .setMinLength(2)
    )
    .addRoleOption(option =>
      option.setName("nollan")
        .setDescription("The nØllan role")
    )
    .addRoleOption(option =>
      option.setName("ingen")
        .setDescription("The INGEN&NÅGON role")
    )
    .addRoleOption(option =>
      option.setName("mux")
        .setDescription("The MUX role")
    )
    .addRoleOption(option =>
      option.setName("fadder")
        .setDescription("The Fadder role")
    )
    .addRoleOption(option =>
      option.setName("doq")
        .setDescription("The Doq role")
    ),
  async execute(interaction) {
    let allowedRoles = [];
    try {
      const data = await fs.readFile(ALLOWED_ROLES, 'utf8');
      const rolesData = JSON.parse(data);
      allowedRoles = rolesData.reception.admin || [];
    } catch (err) {
      return interaction.reply({
        content: "⚠️ Could not read `allowed_roles.json` or it's invalid.",
        flags: MessageFlags.Ephemeral
      });
    }

    const memberRoles = interaction.member.roles.cache;
    const hasPermission = allowedRoles.some(roleId => memberRoles.has(roleId));
    if (!hasPermission) {
      return interaction.reply({
        content: "⛔ You do not have permission to run this command.",
        flags: MessageFlags.Ephemeral
      });
    }

    const requiredRoles = ['nollan', 'ingen', 'mux', 'fadder', 'doq'];
    const roleIds = {};
    let savedRoles = {};
    let receptionRoles = [];
    try {
      const data = await fs.readFile(RECEPTION_DATA, 'utf8');
      const parsedRoles = JSON.parse(data);
      savedRoles = parsedRoles.roles || {};
      receptionRoles = [
        ...Object.values(parsedRoles.roles || {}),
        ...Object.values(parsedRoles.groups || {})
      ];
    } catch (err) {
      return interaction.reply({
        content: "⚠️ Could not read `reception_data.json` or it's invalid.",
        flags: MessageFlags.Ephemeral
      });
    }

    for (const roleName of requiredRoles) {
      const role = interaction.options.getRole(roleName) || (savedRoles[roleName] && interaction.guild.roles.cache.get(savedRoles[roleName]));
      if (!role) {
        await interaction.reply({
          content: `⚠️ Role "${roleName}" is not defined. Provide it using the /${interaction.commandName} command's "${roleName}" option.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      roleIds[roleName] = role.id;
    }

    await interaction.deferReply();

    const groups = interaction.options.getString('groups');
    const groupNames = groups.split(/[\s,;]+/).map(n => n.trim()).filter(Boolean);

    await interaction.editReply([
      `🔄 **Setting up reception for ${YEAR}...**`,
      `🔄 Creating roles...`,
    ].join('\n'));

    const createdRoles = [];
    const groupRoles = new Map();
    const groupRoleIds = {};
    for (const name of groupNames) {
      const role = await interaction.guild.roles.create({
        name,
        permissions: [],
        mentionable: true,
        reason: `Created by ${interaction.user.tag} using /${interaction.commandName}`
      });
      createdRoles.push(`<@&${role.id}> (${role.name})`);
      groupRoles.set(name, role);
      groupRoleIds[name] = role.id;
    }

    await fs.writeFile(
      RECEPTION_DATA,
      JSON.stringify({ roles: roleIds, groups: groupRoleIds, year: YEAR }, null, 2),
      'utf8'
    );

    await interaction.editReply([
      `🔄 **Setting up reception for ${YEAR}...**`,
      `✅ Created roles: ${createdRoles.join(', ')}`,
      `🔄 Creating channels...`,
    ].join('\n'));

    const category = await interaction.guild.channels.create({
      name: `Reception ${YEAR}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: roleIds["nollan"],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: roleIds["ingen"],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: roleIds["mux"],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: roleIds["fadder"],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: roleIds["doq"],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
      reason: `Created by ${interaction.user.tag} using /${interaction.commandName}`
    });

    const createdChannels = [];
    const announcements = await interaction.guild.channels.create({
      name: 'announcements',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
        {
          id: roleIds["nollan"],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: roleIds["ingen"],
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
        {
          id: roleIds["mux"],
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
        {
          id: roleIds["fadder"],
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
        {
          id: roleIds["doq"],
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ],
        },
      ],
      reason: `Created by ${interaction.user.tag} using /${interaction.commandName}`
    });
    createdChannels.push(`<#${announcements.id}> (${announcements.name})`);

    const general = await interaction.guild.channels.create({
      name: 'general',
      type: ChannelType.GuildText,
      parent: category.id,
      reason: `Created by ${interaction.user.tag} using /${interaction.commandName}`
    });
    createdChannels.push(`<#${general.id}> (${general.name})`);

    for (const name of groupNames) {
      const role = groupRoles.get(name);
      const channel = await interaction.guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: roleIds["ingen"],
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: roleIds["mux"],
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: role.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
        reason: `Created by ${interaction.user.tag} using /${interaction.commandName}`
      });
      createdChannels.push(`<#${channel.id}> (${channel.name})`);
    }

    await interaction.editReply([
      `🔄 **Setting up reception for ${YEAR}...**`,
      `✅ Created roles: ${createdRoles.join(', ')}`,
      `✅ Created channels: ${createdChannels.join(', ')}`,
      `🔄 Editing old roles...`,
    ].join('\n'));

    const bot = await interaction.guild.members.fetchMe();
    const botRole = bot.roles.highest.position;
    const roleSettings = {};
    for (const role of interaction.guild.roles.cache.values()) {
      if (!receptionRoles.includes(role.id) && !role.managed && role.position < botRole) {
        roleSettings[role.id] = {
          color: role.color,
          hoist: role.hoist
        };
        await role.edit({
          color: 0,
          hoist: false,
          reason: `Edited by ${interaction.user.tag} using /${interaction.commandName}`
        });
      }
    }
    await fs.writeFile(ROLE_SETTINGS, JSON.stringify(roleSettings, null, 2), 'utf8');

    await interaction.editReply([
      `✅ **Successfully set up reception for ${YEAR}!**`,
      `✅ Created roles: ${createdRoles.join(', ')}`,
      `✅ Created channels: ${createdChannels.join(', ')}`,
      `✅ Edited old roles to not have color and displayed separately`,
      `\nℹ️ Make sure to fix the onboarding questions to be able to get the nØllan role.`,
      `       Double check that no roles that grant access to other channels can be selected in the onboarding.`
    ].join('\n'));
  },
};
