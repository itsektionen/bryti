import 'dotenv/config';
import path from 'node:path';
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ActivityType,
} from 'discord.js';
import { getCommands } from './getCommands.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = await getCommands(path.resolve(), true);

client.login(process.env.TOKEN);

client.once(Events.ClientReady, (client) => {
  console.log(
    `\n${client.readyAt} - Bot ready and connected!\nLogged in as ${client.user.tag} (${client.user.id}) on ${client.guilds.cache.size} server(s).`
  );
  client.user.setActivity('Running around...', { type: ActivityType.Custom });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`Invalid command ${interaction.commandName}`);
    await interaction.reply({
      content: `Invalid command /${interaction.commandName}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: `There was an error while executing /${interaction.commandName}`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `There was an error while executing /${interaction.commandName}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});
