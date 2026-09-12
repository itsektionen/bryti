import { MessageFlags } from 'discord.js';

export const ephemeralMessage = (content) => ({
  content,
  flags: MessageFlags.Ephemeral,
  allowedMentions: { parse: [] },
});
