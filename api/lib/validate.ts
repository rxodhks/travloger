import { HttpError } from "./auth.js";

const MAX_PLACES = 30;
const MIN_PLACES = 2;
const MAX_PLACE_LEN = 200;
const MAX_TOTAL_INPUT_CHARS = 12_000;

export function parsePlacesBody(body: unknown): string[] {
  if (!body || typeof body !== "object") {
    throw new HttpError("Invalid JSON body", 400);
  }
  const places = (body as { places?: unknown }).places;
  if (!Array.isArray(places)) {
    throw new HttpError("places 배열이 필요합니다.", 400);
  }
  if (places.length < MIN_PLACES || places.length > MAX_PLACES) {
    throw new HttpError(`장소는 ${MIN_PLACES}개 이상 ${MAX_PLACES}개 이하여야 합니다.`, 400);
  }

  const strings: string[] = [];
  let total = 0;
  for (const p of places) {
    if (typeof p !== "string") {
      throw new HttpError("각 장소는 문자열이어야 합니다.", 400);
    }
    const t = p.trim();
    if (!t) {
      throw new HttpError("빈 장소 이름은 허용되지 않습니다.", 400);
    }
    if (t.length > MAX_PLACE_LEN) {
      throw new HttpError(`장소 이름은 ${MAX_PLACE_LEN}자 이하여야 합니다.`, 400);
    }
    strings.push(t);
    total += t.length;
  }
  if (total > MAX_TOTAL_INPUT_CHARS) {
    throw new HttpError("입력이 너무 깁니다.", 400);
  }
  return strings;
}
