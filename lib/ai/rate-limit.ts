const WINDOW_MS = 60_000;
const MAX_REQUESTS = 6;
const requestsByUser = new Map<string, number[]>();

export function consumeOutreachRateLimit(userId: string, now = Date.now()) {
  const recent = (requestsByUser.get(userId) || []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_REQUESTS) {
    requestsByUser.set(userId, recent);
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000),
      ),
    };
  }
  recent.push(now);
  requestsByUser.set(userId, recent);

  if (requestsByUser.size > 1_000) {
    for (const [id, timestamps] of requestsByUser) {
      if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS))
        requestsByUser.delete(id);
    }
  }
  return { allowed: true as const, remaining: MAX_REQUESTS - recent.length };
}
