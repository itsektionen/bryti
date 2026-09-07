import { resolveColor } from 'discord.js';

export const COLOR_LABELS = {
  primaryColor: 'Primary',
  secondaryColor: 'Secondary',
  tertiaryColor: 'Tertiary',
};

export const toColor = (name, value) => {
  if (!value) return null;
  try {
    return resolveColor(value);
  } catch {
    const error = new Error(`Invalid ${name} color: ${value}`);
    error.option = name;
    error.value = value;
    throw error;
  }
};

export const toHex = (value) => {
  return `#${value.toString(16).padStart(6, '0')}`;
};

export const rowToColors = (row) => ({
  primaryColor: row.primary_color,
  secondaryColor: row.secondary_color,
  tertiaryColor: row.tertiary_color,
});

export const getColorInfo = (colors) => {
  return Object.entries(COLOR_LABELS)
    .filter(([key]) => colors[key] != null)
    .map(([key, label]) => `${label} ${toHex(colors[key])}`);
};
