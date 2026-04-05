/**
 * supabase/migrations/*.sql 을 시간순으로 합쳐
 * supabase/snippets/apply_full_schema_migrations.sql 을 UTF-8로 생성합니다.
 * (PowerShell Set-Content 등으로 합치면 한글이 깨질 수 있음)
 *
 * 실행: node scripts/merge-supabase-migrations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const migDir = path.join(root, "supabase", "migrations");
const outFile = path.join(root, "supabase", "snippets", "apply_full_schema_migrations.sql");

const HEADER = `/*
 * Travloger — 전체 DB 스키마 한 번에 적용 (자동 생성: node scripts/merge-supabase-migrations.mjs)
 *
 * 인코딩: UTF-8(무 BOM). 이 스크립트로 재생성하면 한글·이모지가 보존됩니다.
 *
 * 사용: Supabase Dashboard → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
 *
 * 조건: 새 프로젝트이거나, public 스키마를 비운 뒤에만 실행하세요.
 *       이미 일부 테이블이 있으면 중간에 "already exists" 오류가 날 수 있습니다.
 *
 * 적용 후: Dashboard → Settings → API → Reload schema (또는 1~2분 대기)
 *
 * Edge Functions CORS/404: DB와 별개로, 함수가 배포되지 않으면 OPTIONS가 실패합니다.
 *   supabase login
 *   supabase link --project-ref <프로젝트 ref>
 *   supabase functions deploy check-subscription create-checkout create-toss-payment confirm-toss-payment customer-portal exchange-rates archive-expired-trips
 *   (AI는 Vercel /api 로 쓰는 경우 optimize-route, ai-travel-recommend 배포 생략 가능)
 *
 * 각 함수에 필요한 Secrets 는 Supabase Dashboard → Edge Functions → Secrets 에 설정하세요.
 */

`;

const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

let body = HEADER;
for (const name of files) {
  body += `\n\n-- ========== ${name} ==========\n\n`;
  body += fs.readFileSync(path.join(migDir, name), "utf8");
}

body = body.replace(
  /INSERT INTO storage\.buckets \(id, name, public\)\s*\nVALUES \('photos', 'photos', true\);/,
  "INSERT INTO storage.buckets (id, name, public)\nVALUES ('photos', 'photos', true)\nON CONFLICT (id) DO NOTHING;"
);

body = body.replace(
  /ALTER PUBLICATION supabase_realtime ADD TABLE public\.notifications;/g,
  `DO $pub$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%already%' OR SQLSTATE = '42710' THEN NULL;
    ELSE RAISE;
    END IF;
END;
$pub$;`
);

body = body.replace(
  /CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;\s*\nCREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;/,
  `DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron skipped (플랜/권한): %', SQLERRM;
END;
$ext$;

DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net skipped: %', SQLERRM;
END;
$ext$;`
);

fs.writeFileSync(outFile, body, { encoding: "utf8" });
console.log("Wrote", outFile);
