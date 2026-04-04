const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ChatOptions = { temperature: number };

/**
 * LLM 호출. Vercel 환경 변수 우선순위:
 * 1) OPENAI_API_KEY — OpenAI 호환 `/v1/chat/completions` (기본 URL: https://api.openai.com/v1)
 * 2) LOVABLE_API_KEY — Lovable 게이트웨이 (기존 동작)
 *
 * OpenRouter, Azure OpenAI 등은 OPENAI_BASE_URL만 맞추면 동일 형식으로 사용 가능합니다.
 */
export async function chatCompletion(userContent: string, options: ChatOptions): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    const url = `${base}/chat/completions`;

    const aiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userContent }],
        temperature: options.temperature,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI API error: ${aiRes.status} ${errText.slice(0, 500)}`);
    }

    const aiData = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return aiData.choices?.[0]?.message?.content ?? "";
  }

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    const aiRes = await fetch(LOVABLE_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: process.env.LOVABLE_CHAT_MODEL || "google/gemini-2.5-flash",
        messages: [{ role: "user", content: userContent }],
        temperature: options.temperature,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI gateway error: ${aiRes.status} ${errText.slice(0, 500)}`);
    }

    const aiData = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return aiData.choices?.[0]?.message?.content ?? "";
  }

  throw new Error(
    "AI is not configured: set OPENAI_API_KEY (recommended) or LOVABLE_API_KEY on Vercel."
  );
}
