import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));

const isTest =
  process.argv.includes('--test') || process.env.BRYTI_ENV === 'test';

const prefix = isTest ? 'TEST_' : '';

const token = process.env[`${prefix}TOKEN`];
const clientId = process.env[`${prefix}CLIENT`];
const guildId = process.env[`${prefix}GUILD`];

const missing = Object.entries({
  [`${prefix}TOKEN`]: token,
  [`${prefix}CLIENT`]: clientId,
  [`${prefix}GUILD`]: guildId,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(
    `Missing environment variable(s): ${missing.join(', ')}.\n` +
    `Copy .env.example to .env and fill it in.`
  );
  process.exit(1);
}

export const env = {
  isTest,
  name: isTest ? 'test' : 'production',
  token,
  clientId,
  guildId,
  rootDir,
  dbPath: path.join(rootDir, 'data', isTest ? 'bryti.test.db' : 'bryti.db'),
};

export function logTarget(action) {
  console.log(
    `${action} in ${env.name.toUpperCase()} mode (guild ${env.guildId}).`
  );
}
