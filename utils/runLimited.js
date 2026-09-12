export async function runLimited(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function loop() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = { status: 'fulfilled', value: await worker(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, loop);
  await Promise.all(workers);
  return results;
}
