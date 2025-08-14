import { SlashCommandBuilder, ChannelType } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const RECEPTION_DATA = path.resolve('reception_data.json');

export default {
  data: new SlashCommandBuilder()
    .setName('removereception')
    .setDescription('Removes the server for reception. Resetting everything to default.')
    .addStringOption(option =>
      option.setName("receptioncategory")
        .setDescription("Name of the reception category")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("archivecategory")
        .setDescription("Name of the archive category")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const receptionCategoryName = interaction.options.getString('receptioncategory');
    const receptionCategory = interaction.guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name === receptionCategoryName
    );
    if (!receptionCategory) {
      await interaction.editReply(
        `Reception category "${receptionCategoryName}" not found.`
      );
      return;
    }

    const archiveCategoryName = interaction.options.getString('archivecategory');
    const archiveCategory = interaction.guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name === archiveCategoryName
    );
    if (!archiveCategory) {
      await interaction.editReply(
        `Archive category "${archiveCategoryName}" not found.`,
      );
      return;
    }

    await interaction.editReply(
      `Moving channels from "${receptionCategoryName}" to "${archiveCategoryName}"...`
    );

    const channels = interaction.guild.channels.cache.filter(
      channel => channel.parentId === receptionCategory.id);
    const data = JSON.parse(await fs.readFile(RECEPTION_DATA, 'utf8'));
    const year = data.year ?? new Date().getFullYear();
    for (const channel of channels.values()) {
      await channel.setParent(archiveCategory.id, { lockPermissions: true });
      await channel.setName(`Ø${year.toString().slice(-2)}-${channel.name}`);
    }

    await receptionCategory.delete(`Removed by ${interaction.user.tag} using /${interaction.commandName}`);

    for (const roleId of Object.values(data.groups)) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (role) {
        await role.delete(`Removed by ${interaction.user.tag} using /${interaction.commandName}`);
      }
    }

    await interaction.editReply(
      `Moved channels to "${archiveCategoryName}". Removed category "${receptionCategoryName}".`
    );
  },
};
