import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, requireUser, HttpError } from "./lib/auth";

export const config = { maxDuration: 60 };
import { resolveCorsOrigin, applyCorsHeaders, securityHeaders } from "./lib/cors";
import { checkAiRateLimit } from "./lib/rateLimit";
import { chatCompletion } from "./lib/aiProvider";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOrigin = resolveCorsOrigin(req);
  applyCorsHeaders(req, res, corsOrigin);
  securityHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.headers.origin && !corsOrigin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const supabase = createServiceClient();
    const user = await requireUser(req, supabase);

    if (!checkAiRateLimit(user.id, "ai-travel-recommend")) {
      return res
        .status(429)
        .json({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요." });
    }

    const { data: checkins } = await supabase
      .from("checkins")
      .select("name, location, emoji")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: memories } = await supabase
      .from("memories")
      .select("content, location, mood")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const visitedPlaces = [
      ...(checkins || []).map((c) => c.location || c.name).filter(Boolean),
      ...(memories || []).map((m) => m.location).filter(Boolean),
    ];

    const moods = (memories || []).map((m) => m.mood).filter(Boolean);

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

    const content = await chatCompletion(prompt, { temperature: 0.8 });

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let recommendations: unknown[] = [];
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendations = Array.isArray(parsed) ? parsed : [];
      } catch {
        return res.status(502).json({ error: "AI 응답 형식이 올바르지 않습니다." });
      }
    }

    return res.status(200).json({ recommendations });
  } catch (e) {
    if (e instanceof HttpError) {
      const clientMsg =
        e.status >= 500 ? "서버 오류가 발생했습니다." : e.message;
      return res.status(e.status).json({ error: clientMsg });
    }
    console.error("ai-travel-recommend", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
