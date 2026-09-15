/**
 * React Native & Hermes-compatible fetch wrapper with timeout support.
 * AbortSignal.timeout() is not supported in React Native Hermes JavaScript engine.
 */

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}
