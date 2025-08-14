import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function getCommands(baseDir, asMap = false) {
  const commandsDir = path.join(baseDir, 'commands');
  const commandFolders = fs.readdirSync(commandsDir);
  const commands = asMap ? new Map() : [];
  for (const folder of commandFolders) {
    const commandsPath = path.join(commandsDir, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const commandModule = await import(pathToFileURL(filePath).href);
      const command = commandModule.default;
      if ('data' in command && 'execute' in command) {
        if (asMap) {
          commands.set(command.data.name, command);
        } else {
          commands.push(command.data.toJSON());
        }
      } else {
        console.warn(
          `${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
  return commands;
}
