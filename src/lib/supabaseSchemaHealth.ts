/** PostgREST: 테이블이 없거나 API 스키마 캐시에 없을 때 */
export function isRestTableMissingError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const m = (error.message || "").toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    m.includes("relation") && m.includes("does not exist")
  );
}

/** 레포 루트 기준 (문서용 문자열만) */
export const FULL_SCHEMA_SQL_FILE =
  "supabase/snippets/apply_full_schema_migrations.sql";
