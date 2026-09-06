import { REST, Routes } from 'discord.js';
import { env, logTarget } from './config/env.js';
import { getCommands } from './getCommands.js';

const commands = await getCommands(env.rootDir);
const rest = new REST().setToken(env.token);

try {
  logTarget(`Refreshing ${commands.length} application (/) commands`);

  const data = await rest.put(
    Routes.applicationGuildCommands(env.clientId, env.guildId),
    { body: commands }
  );

  console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
