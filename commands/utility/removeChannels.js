import { SlashCommandBuilder, ChannelType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removechannels')
    .setDescription('Removes a category and all its channels.')
    .addStringOption(option =>
      option.setName("category")
        .setDescription("Name of the category to remove.")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const categoryName = interaction.options.getString('category');
    const category = interaction.guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName
    );

    if (!category) {
      await interaction.editReply(
        `Category "${categoryName}" not found.`
      );
      return;
    }

    await interaction.editReply(`Removing channels from category "${categoryName}"...`);

    const channels = interaction.guild.channels.cache.filter(ch => ch.parentId === category.id);
    for (const channel of channels.values()) {
      await channel.delete(`Removed by ${interaction.user.tag} using /${interaction.commandName}`);
    }

    await category.delete(`Removed by ${interaction.user.tag} using /${interaction.commandName}`);

    await interaction.editReply(`Removed category "${categoryName}" and all its channels.`);
  },
};
