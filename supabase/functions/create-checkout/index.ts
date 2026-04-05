import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_MAP: Record<string, { priceId: string; mode: "subscription" | "payment" }> = {
  monthly: { priceId: "price_1TF8dXCED1ngb8l7HuXbukcX", mode: "subscription" },
  yearly: { priceId: "price_1TF8eACED1ngb8l7KjIgZ1wD", mode: "subscription" },
  lifetime: { priceId: "price_1TF8eVCED1ngb8l727qOKvCa", mode: "payment" },
};

/** 브라우저 외 호출 등에서 Origin 이 없을 수 있음 → Stripe URL 검증 실패 방지 */
function resolveAppOrigin(req: Request): string {
  const origin = req.headers.get("origin")?.trim();
  if (origin?.startsWith("http")) return origin;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      /* ignore */
    }
  }
  const fromEnv = Deno.env.get("SITE_URL")?.trim() ?? Deno.env.get("PUBLIC_APP_URL")?.trim();
  if (fromEnv?.startsWith("http")) return fromEnv;
  return "http://localhost:8080";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseAnon);

  try {
    if (!supabaseUrl || !supabaseAnon) {
      throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is not set for Edge Functions secrets");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set (Supabase Dashboard → Edge Functions → Secrets)");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan } = await req.json();
    const planConfig = PRICE_MAP[plan];
    if (!planConfig) throw new Error("Invalid plan");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const appOrigin = resolveAppOrigin(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      mode: planConfig.mode,
      success_url: `${appOrigin}/premium?success=true`,
      cancel_url: `${appOrigin}/premium?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
