export const CUSTOM_ID_MAX_LENGTH = 100;

const SEPARATOR = ':';

export function buildCustomId(namespace, action, id = '') {
  for (const part of [namespace, action]) {
    if (!part || part.includes(SEPARATOR)) {
      throw new Error(`Invalid custom id part "${part}".`);
    }
  }

  const customId = [namespace, action, id].filter(Boolean).join(SEPARATOR);
  if (customId.length > CUSTOM_ID_MAX_LENGTH) {
    throw new Error(
      `Custom id "${customId}" is ${customId.length} characters, the limit is ${CUSTOM_ID_MAX_LENGTH}.`
    );
  }
  return customId;
}

export function parseCustomId(customId) {
  const [namespace, action = '', ...rest] = customId.split(SEPARATOR);
  return { namespace, action, id: rest.join(SEPARATOR) };
}
