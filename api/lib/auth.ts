import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError("Server configuration error", 500);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function requireUser(
  req: VercelRequest,
  supabase: SupabaseClient
): Promise<{ id: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError("Unauthorized", 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new HttpError("Unauthorized", 401);
  }

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) {
    throw new HttpError("Unauthorized", 401);
  }

  return { id: userData.user.id };
}
