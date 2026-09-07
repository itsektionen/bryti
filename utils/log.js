const timestamp = () => {
  return new Date().toLocaleString('sv-SE');
};

export const logInfo = (...args) => {
  console.info(`[${timestamp()}] INFO:`, ...args);
};

export const logWarn = (...args) => {
  console.warn(`[${timestamp()}] WARN:`, ...args);
};

export const logError = (...args) => {
  console.error(`[${timestamp()}] ERROR:`, ...args);
};
