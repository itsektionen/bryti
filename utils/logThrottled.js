const seen = new Map();

export function logThrottled(key, windowMs, log) {
  const now = Date.now();
  const entry = seen.get(key);

  if (entry && now < entry.until) {
    entry.hidden++;
    return;
  }

  const hidden = entry?.hidden ?? 0;
  seen.set(key, { until: now + windowMs, hidden: 0 });
  log(hidden);
}
