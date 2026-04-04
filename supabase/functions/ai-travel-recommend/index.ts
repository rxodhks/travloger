import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Fetch user's checkins and memories for context
    const { data: checkins } = await supabaseClient
      .from("checkins")
      .select("name, location, emoji")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: memories } = await supabaseClient
      .from("memories")
      .select("content, location, mood")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const visitedPlaces = [
      ...(checkins || []).map(c => c.location || c.name).filter(Boolean),
      ...(memories || []).map(m => m.location).filter(Boolean),
    ];

    const moods = (memories || []).map(m => m.mood).filter(Boolean);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not set");

    const prompt = `You are a Korean travel recommendation AI. Based on the user's travel history and preferences, suggest 5 travel destinations they might enjoy.

User's visited places: ${visitedPlaces.length > 0 ? visitedPlaces.join(", ") : "아직 방문 기록이 없음"}
User's recent moods: ${moods.length > 0 ? moods.join(", ") : "기록 없음"}

Respond ONLY in Korean. Return a JSON array of exactly 5 recommendations with this format:
[
  {
    "name": "장소 이름",
    "description": "왜 추천하는지 1-2문장",
    "emoji": "관련 이모지 1개",
    "category": "카테고리 (자연/도시/문화/맛집/힐링 중 하나)"
  }
]

Return ONLY the JSON array, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
