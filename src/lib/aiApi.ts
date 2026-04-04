function apiBase(): string {
  const b = import.meta.env.VITE_API_BASE_URL;
  return typeof b === "string" ? b.replace(/\/$/, "") : "";
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("서버 응답을 읽을 수 없습니다.");
  }
}

export async function postOptimizeRoute(
  places: string[],
  accessToken: string
): Promise<{
  optimized: string[];
  tips: { from: string; to: string; tip: string }[];
  summary: string;
}> {
  const base = apiBase();
  const res = await fetch(`${base}/api/optimize-route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ places }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "요청에 실패했습니다.");
  }
  return data as {
    optimized: string[];
    tips: { from: string; to: string; tip: string }[];
    summary: string;
  };
}

export async function postAiTravelRecommend(accessToken: string): Promise<{
  recommendations: Array<{
    name: string;
    description: string;
    emoji: string;
    category: string;
  }>;
}> {
  const base = apiBase();
  const res = await fetch(`${base}/api/ai-travel-recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "요청에 실패했습니다.");
  }
  return data as {
    recommendations: Array<{
      name: string;
      description: string;
      emoji: string;
      category: string;
    }>;
  };
}
