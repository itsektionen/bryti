import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { getCommands } from './getCommands.js';
import path from 'node:path';

const commands = await getCommands(path.resolve());
const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT, process.env.GUILD),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
