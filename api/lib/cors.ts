import type { VercelRequest, VercelResponse } from "@vercel/node";

function defaultAllowedOrigins(): string[] {
  const out: string[] = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  if (process.env.VERCEL_URL) {
    out.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.WEB_APP_ORIGIN) {
    out.push(process.env.WEB_APP_ORIGIN.replace(/\/$/, ""));
  }
  return out;
}

function parseAllowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...new Set([...defaultAllowedOrigins(), ...extra])];
}

/**
 * Returns the Origin header value to echo in Access-Control-Allow-Origin, or null if Origin must be rejected.
 */
export function resolveCorsOrigin(request: VercelRequest): string | null {
  const origin = request.headers.origin;
  if (!origin) return null;

  const allowed = parseAllowedOrigins();

  const exact = allowed.includes(origin);
  if (exact) return origin;

  const wildcard = allowed.filter((a) => a.startsWith("*."));
  for (const pattern of wildcard) {
    const base = pattern.slice(2);
    if (!base) continue;
    try {
      const host = new URL(origin).hostname;
      if (host === base || host.endsWith(`.${base}`)) {
        return origin;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function applyCorsHeaders(
  request: VercelRequest,
  response: VercelResponse,
  corsOrigin: string | null
): void {
  if (corsOrigin) {
    response.setHeader("Access-Control-Allow-Origin", corsOrigin);
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Max-Age", "86400");
    response.setHeader("Vary", "Origin");
  }
}

export function securityHeaders(response: VercelResponse): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
}
