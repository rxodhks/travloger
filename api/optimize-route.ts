import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceClient, requireUser, HttpError } from "./lib/auth";

export const config = { maxDuration: 60 };
import { resolveCorsOrigin, applyCorsHeaders, securityHeaders } from "./lib/cors";
import { checkAiRateLimit } from "./lib/rateLimit";
import { parsePlacesBody } from "./lib/validate";
import { lovableChatCompletion } from "./lib/aiLovable";

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

    if (!checkAiRateLimit(user.id, "optimize-route")) {
      return res
        .status(429)
        .json({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요." });
    }

    const places = parsePlacesBody(req.body);

    const prompt = `당신은 한국 국내 여행 동선 최적화 전문가입니다.
아래 장소 목록을 받아서, 방문 순서·장소 간 거리·일반적인 영업시간을 고려하여 가장 효율적인 동선으로 재배치해 주세요.

장소 목록: ${JSON.stringify(places)}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "optimized": ["장소1", "장소2", ...],
  "tips": [
    {"from": "장소1", "to": "장소2", "tip": "이동 팁 (거리, 소요시간, 교통수단 등)"}
  ],
  "summary": "전체 동선 요약 한 줄"
}

규칙:
- 모든 장소를 빠짐없이 포함
- 한국어로만 응답
- 아침에 시작하여 저녁에 끝나는 일정 기준
- 영업시간이 제한적인 장소(예: 시장, 박물관)를 우선 배치
- JSON만 출력, 다른 텍스트 없이`;

    const content = await lovableChatCompletion(prompt, { temperature: 0.3 });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: "AI 응답을 해석할 수 없습니다." });
    }

    let result: unknown;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(502).json({ error: "AI 응답 형식이 올바르지 않습니다." });
    }
    return res.status(200).json(result);
  } catch (e) {
    if (e instanceof HttpError) {
      const clientMsg =
        e.status >= 500 ? "서버 오류가 발생했습니다." : e.message;
      return res.status(e.status).json({ error: clientMsg });
    }
    console.error("optimize-route", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
