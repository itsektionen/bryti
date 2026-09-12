import { MessageFlags } from 'discord.js';
import { logError, logInfo } from './utils/log.js';
import { parseCustomId } from './utils/customId.js';
import { logThrottled } from './utils/logThrottled.js';

const AUTOCOMPLETE_ERROR_WINDOW_MS = 60 * 1000;

async function replyError(interaction, message) {
  const body = { content: message, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(body);
    } else {
      await interaction.reply(body);
    }
  } catch (error) {
    logError('Could not send the error reply.', error);
  }
}

function describeOptions(options) {
  return options
    .map((option) =>
      option.options
        ? `${option.name} ${describeOptions(option.options)}`
        : `${option.name}:${option.value}`
    )
    .join(' ')
    .trimEnd();
}

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    logError(`Unknown command /${interaction.commandName}.`);
    await replyError(
      interaction,
      `Unknown command /${interaction.commandName}.`
    );
    return;
  }

  try {
    await command.execute(interaction);
    logInfo(
      `${interaction.user.tag} (${interaction.user.id}) ran "/${interaction.commandName} ${describeOptions(interaction.options.data)}" in ${interaction.guild?.name} (${interaction.guild?.id})`
    );
  } catch (error) {
    logError(`/${interaction.commandName} failed.`, error);
    await replyError(
      interaction,
      `Something went wrong while running \`/${interaction.commandName}\`.`
    );
  }
}

async function respondEmpty(interaction) {
  if (interaction.responded) return;
  try {
    await interaction.respond([]);
  } catch {}
}

async function handleAutocomplete(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command?.autocomplete) return respondEmpty(interaction);

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    await respondEmpty(interaction);
    logThrottled(
      `autocomplete:${interaction.commandName}`,
      AUTOCOMPLETE_ERROR_WINDOW_MS,
      (hidden) => {
        const repeats = hidden > 0 ? ` (${hidden} repeat(s) hidden)` : '';
        logError(
          `Autocomplete for /${interaction.commandName} failed${repeats}.`,
          error
        );
      }
    );
  }
}

async function handleComponent(interaction, handlers, kind) {
  const { namespace, action, id } = parseCustomId(interaction.customId);
  const handler = handlers.get(namespace);
  if (!handler) {
    logError(`Unknown ${kind} "${interaction.customId}".`);
    await replyError(interaction, 'This control is no longer available.');
    return;
  }

  try {
    await handler.execute(interaction, { action, id });
  } catch (error) {
    logError(`${kind} "${interaction.customId}" failed.`, error);
    await replyError(interaction, 'Something went wrong.');
  }
}

export function createRouter(client) {
  return async function route(interaction) {
    if (interaction.isChatInputCommand()) {
      return handleCommand(interaction);
    }
    if (interaction.isAutocomplete()) {
      return handleAutocomplete(interaction);
    }
    if (interaction.isModalSubmit()) {
      return handleComponent(interaction, client.modalHandlers, 'modal');
    }
    if (interaction.isMessageComponent()) {
      return handleComponent(interaction, client.buttonHandlers, 'component');
    }
  };
}
