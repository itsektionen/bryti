import path from 'node:path';
import { loadModules, collect } from './loadModules.js';

function isHandler(value) {
  return typeof value === 'object' && 'name' in value && 'execute' in value;
}

export async function getHandlers(baseDir, kind) {
  const modules = await loadModules(path.join(baseDir, 'handlers', kind));
  return collect(modules, {
    keyOf: (handler) => handler.name,
    isValid: isHandler,
    label: `${kind} handler`,
  });
}
