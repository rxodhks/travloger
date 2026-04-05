import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  monthly: { amount: 4900, name: "Travloger 프리미엄 월간" },
  yearly: { amount: 39000, name: "Travloger 프리미엄 연간" },
  lifetime: { amount: 99000, name: "Travloger 프리미엄 평생" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { plan } = await req.json();
    const planConfig = PLAN_PRICES[plan];
    if (!planConfig) throw new Error("Invalid plan");

    const orderId = `order_${user.id.slice(0, 8)}_${Date.now()}`;

    // Store pending order in subscriptions table
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseAdmin.from("subscriptions").insert({
      user_id: user.id,
      plan,
      status: "pending",
      expires_at: null,
    });

    return new Response(JSON.stringify({
      orderId,
      amount: planConfig.amount,
      orderName: planConfig.name,
      customerEmail: user.email,
      customerName: user.user_metadata?.display_name || "고객",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
