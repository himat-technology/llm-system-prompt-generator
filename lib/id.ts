let fallbackCounter = 0;

/** Generates a client-side unique id. Uses `crypto.randomUUID` when available. */
export function createId(prefix = "id"): string {
  const cryptoApi: Crypto | undefined = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  fallbackCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
