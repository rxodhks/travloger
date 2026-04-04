const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function lovableChatCompletion(
  userContent: string,
  options: { temperature: number }
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const aiRes = await fetch(LOVABLE_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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
