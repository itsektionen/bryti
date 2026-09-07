import { Client, Events, GatewayIntentBits, ActivityType } from 'discord.js';
import { env, logTarget } from './config/env.js';
import { getCommands } from './getCommands.js';
import { getHandlers } from './getHandlers.js';
import { createRouter } from './router.js';
import { purgeExpiredPending } from './db/pending.js';
import { logInfo, logWarn } from './utils/log.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  rest: { invalidRequestWarningInterval: 100 },
});

client.commands = await getCommands(env.rootDir, true);
client.buttonHandlers = await getHandlers(env.rootDir, 'buttons');
client.modalHandlers = await getHandlers(env.rootDir, 'modals');

client.rest.on('invalidRequestWarning', ({ count, remainingTime }) => {
  logWarn(
    `${count} invalid requests sent, ${remainingTime}ms left in this window.`
  );
});

client.once(Events.ClientReady, (readyClient) => {
  logInfo(
    `Bot ready as ${readyClient.user.tag} (${readyClient.user.id}) on ${readyClient.guilds.cache.size} server${readyClient.guilds.cache.size > 1 ? 's' : ''}.`
  );
  readyClient.user.setActivity('Running around...', {
    type: ActivityType.Custom,
  });

  const purged = purgeExpiredPending();
  if (purged > 0) {
    logInfo(`Removed ${purged} expired pending row(s).`);
  }
});

client.on(Events.InteractionCreate, createRouter(client));

logTarget('Starting bot');
client.login(env.token);
