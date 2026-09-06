import path from 'node:path';
import { loadModules, collect } from './loadModules.js';

function isCommand(value) {
  return typeof value === 'object' && 'data' in value && 'execute' in value;
}

export async function getCommands(baseDir, asMap = false) {
  const modules = await loadModules(path.join(baseDir, 'commands'));
  const commands = collect(modules, {
    keyOf: (command) => command.data.name,
    isValid: isCommand,
    label: 'command',
  });

  if (asMap) return commands;
  return [...commands.values()].map((command) => command.data.toJSON());
}
