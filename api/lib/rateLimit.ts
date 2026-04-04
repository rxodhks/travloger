/**
 * Best-effort per-instance rate limiting (resets on cold start).
 * For strict quotas, use Upstash / Vercel KV and wire env in production.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

function limits() {
  const max = Math.max(1, parseInt(process.env.AI_RATE_LIMIT_MAX ?? "30", 10) || 30);
  const windowMs = Math.max(
    60_000,
    parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS ?? String(60 * 60 * 1000), 10) || 60 * 60 * 1000
  );
  return { max, windowMs };
}

export function checkAiRateLimit(userId: string, routeKey: string): boolean {
  const { max, windowMs } = limits();
  const key = `${userId}:${routeKey}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= max) {
    return false;
  }
  b.count += 1;
  return true;
}
