const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 16000;
const MAX_RETRIES = 5;

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) throw error;
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      await new Promise<void>(r => setTimeout(r, jitter));
    }
  }
}
