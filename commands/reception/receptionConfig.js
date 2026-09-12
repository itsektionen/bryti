import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import {
  ROLE_SLUGS,
  ROLE_LABELS,
  setReceptionRoleId,
  setReceptionRoleAppearance,
  getReceptionRoles,
} from '../../db/receptionRoles.js';
import { ephemeralMessage } from '../../utils/messages.js';
import { ADMIN_PERMISSION } from '../../utils/permissions.js';
import { toColor, getColorInfo, rowToColors } from '../../utils/colors.js';

const slugChoices = ROLE_SLUGS.map((slug) => ({
  name: ROLE_LABELS[slug],
  value: slug,
}));

async function handleRoles(interaction) {
  const changed = [];

  for (const slug of ROLE_SLUGS) {
    const role = interaction.options.getRole(slug);
    if (!role) {
      continue;
    }

    setReceptionRoleId(interaction.guildId, slug, role.id);
    changed.push(`- ${ROLE_LABELS[slug]}: <@&${role.id}>`);
  }

  if (changed.length === 0) {
    await interaction.reply(
      ephemeralMessage('Nothing was changed, as no roles were given.')
    );
    return;
  }

  await interaction.reply(
    ephemeralMessage(
      `Updated ${changed.length} role${changed.length > 1 ? 's' : ''}:\n${changed.join('\n')}`
    )
  );
}

async function handleAppearance(interaction) {
  const slug = interaction.options.getString('slug');
  const name = interaction.options.getString('name');
  let colors;
  try {
    colors = {
      primaryColor: toColor(
        'primary',
        interaction.options.getString('primary')
      ),
      secondaryColor: toColor(
        'secondary',
        interaction.options.getString('secondary')
      ),
      tertiaryColor: toColor(
        'tertiary',
        interaction.options.getString('tertiary')
      ),
    };
  } catch (error) {
    await interaction.reply(
      ephemeralMessage(
        `\`${error.value}\` is not a valid ${error.option} color. Use a hex value like \`#cc99ff\`.`
      )
    );
    return;
  }

  const changed = [];
  if (name) {
    changed.push(`- Name: ${name}`);
  }
  changed.push(...getColorInfo(colors).map((line) => `- ${line}`));
  if (changed.length === 0) {
    await interaction.reply(
      ephemeralMessage('Nothing was changed as no name or color was given.')
    );
    return;
  }

  setReceptionRoleAppearance(interaction.guildId, slug, { name, colors });
  await interaction.reply(
    ephemeralMessage(`Updated ${ROLE_LABELS[slug]}:\n${changed.join('\n')}`)
  );
}

function getRolesInfo(slug, row) {
  if (!row?.role_id) {
    return [`- ${ROLE_LABELS[slug]}: *unset*`];
  }

  const lines = [`- ${ROLE_LABELS[slug]}: <@&${row.role_id}>`];
  if (row.name) {
    lines.push(`  - Name: ${row.name}`);
  }

  const colors = getColorInfo(rowToColors(row));
  if (colors.length > 0) {
    lines.push(`  - Colors: ${colors.join(', ')}`);
  }
  return lines;
}

async function handleShow(interaction) {
  const roles = getReceptionRoles(interaction.guildId);
  const lines = ROLE_SLUGS.flatMap((slug) => getRolesInfo(slug, roles[slug]));
  const ready = ROLE_SLUGS.filter((slug) => roles[slug]?.role_id).length;
  const total = ROLE_SLUGS.length;
  const summary =
    ready === total
      ? `All ${total} reception roles are set.`
      : `${ready} of ${total} reception roles are set. \`/reception setup\` needs all ${total}.`;

  await interaction.reply(
    ephemeralMessage(`${lines.join('\n')}\n\n${summary}`)
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('receptionconfig')
    .setDescription('Sets up which roles reception uses.')
    .setDefaultMemberPermissions(ADMIN_PERMISSION)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((command) => {
      command
        .setName('roles')
        .setDescription(
          'Set which Discord role each reception role points at.'
        );
      for (const slug of ROLE_SLUGS) {
        command.addRoleOption((option) =>
          option.setName(slug).setDescription(`Role for ${ROLE_LABELS[slug]}.`)
        );
      }
      return command;
    })
    .addSubcommand((command) =>
      command
        .setName('appearance')
        .setDescription('Set the name and colors of a reception role.')
        .addStringOption((option) =>
          option
            .setName('slug')
            .setDescription('Which reception role to change.')
            .setRequired(true)
            .addChoices(...slugChoices)
        )
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('The name of the role.')
            .setRequired(false)
            .setMinLength(2)
            .setMaxLength(16)
        )
        .addStringOption((option) =>
          option
            .setName('primary')
            .setDescription('Primary color as a hex value like #cc99ff.')
            .setRequired(false)
            .setMinLength(4)
            .setMaxLength(7)
        )
        .addStringOption((option) =>
          option
            .setName('secondary')
            .setDescription(
              'Secondary color as a hex value like #cc99ff, for role gradients (if Server Boost enabled).'
            )
            .setRequired(false)
            .setMinLength(4)
            .setMaxLength(7)
        )
        .addStringOption((option) =>
          option
            .setName('tertiary')
            .setDescription(
              'Tertiary color as a hex value like #cc99ff, for role gradients (if Server Boost enabled).'
            )
            .setRequired(false)
            .setMinLength(4)
            .setMaxLength(7)
        )
    )
    .addSubcommand((command) =>
      command
        .setName('show')
        .setDescription('Show the current reception configuration.')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const handler = {
      roles: handleRoles,
      appearance: handleAppearance,
      show: handleShow,
    }[subcommand];

    if (!handler) {
      await interaction.reply(
        ephemeralMessage(`Unknown subcommand \`${subcommand}\`.`)
      );
      return;
    }

    await handler(interaction);
  },
};
