import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logWarn } from './utils/log.js';

export async function loadModules(dir) {
  if (!fs.existsSync(dir)) return [];

  const modules = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      modules.push(...(await loadModules(filePath)));
    } else if (entry.name.endsWith('.js')) {
      const module = await import(pathToFileURL(filePath).href);
      modules.push({ filePath, value: module.default });
    }
  }
  return modules;
}

export function collect(modules, { keyOf, isValid, label }) {
  const map = new Map();
  for (const { filePath, value } of modules) {
    if (value === undefined) continue;

    if (!isValid(value)) {
      logWarn(`${filePath} is not a valid ${label}. Skipping.`);
      continue;
    }

    const key = keyOf(value);
    if (map.has(key)) {
      logWarn(`${filePath} reuses the ${label} name "${key}". Skipping.`);
      continue;
    }
    map.set(key, value);
  }
  return map;
}
