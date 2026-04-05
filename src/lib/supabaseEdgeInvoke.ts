import { supabase } from "@/integrations/supabase/client";

function functionsHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const e = error as { context?: { status?: number }; status?: number };
    return e.context?.status ?? e.status;
  }
  return undefined;
}

/**
 * Edge Function 호출 전 세션 갱신, 명시적 Bearer, 401 시 한 번 재시도.
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  options?: { body?: object }
): Promise<{ data: T | null; error: Error | null }> {
  const invokeOnce = (accessToken: string) =>
    supabase.functions.invoke<T>(name, {
      body: options?.body,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

  /** 게이트웨이는 만료 access_token 이면 401 → refresh 응답의 토큰을 우선 사용 */
  const refreshToken = async (): Promise<string | null> => {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  let token = await refreshToken();
  if (!token) {
    return { data: null, error: new Error("로그인이 필요합니다.") };
  }

  let { data, error } = await invokeOnce(token);
  if (error && functionsHttpStatus(error) === 401) {
    token = await refreshToken();
    if (token) {
      ({ data, error } = await invokeOnce(token));
    }
  }

  if (error) {
    const msg =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: string }).message)
        : "요청에 실패했습니다.";
    return { data: data as T | null, error: new Error(msg) };
  }

  return { data: data as T | null, error: null };
}
