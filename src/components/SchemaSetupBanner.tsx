import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSchemaHealth } from "@/contexts/SchemaHealthContext";
import { FULL_SCHEMA_SQL_FILE } from "@/lib/supabaseSchemaHealth";

/**
 * DB 마이그레이션이 적용되지 않은 Supabase 프로젝트에서 /rest/v1/* 404 가 날 때 안내.
 */
const SchemaSetupBanner = () => {
  const { status } = useSchemaHealth();

  if (status !== "missing") return null;

  return (
    <div className="sticky top-0 z-[100] px-3 pt-2 pb-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-destructive/25">
      <Alert variant="destructive" className="rounded-lg shadow-sm max-w-3xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-sm">Supabase 데이터베이스 스키마가 비어 있습니다</AlertTitle>
        <AlertDescription className="text-xs mt-1 space-y-1.5 leading-relaxed">
          <p>
            앱 코드는 정상입니다. <code className="bg-background/80 px-1 rounded">checkins</code>,{" "}
            <code className="bg-background/80 px-1 rounded">trip_plans</code>,{" "}
            <code className="bg-background/80 px-1 rounded">profiles</code> 등 테이블이 프로젝트에 없어 REST API가
            404를 반환합니다.
          </p>
          <p>
            <strong>해결:</strong> Supabase Dashboard → <strong>SQL Editor</strong>에서 GitHub 레포의{" "}
            <code className="bg-background/80 px-1 rounded break-all">{FULL_SCHEMA_SQL_FILE}</code> 파일 전체를
            실행한 뒤 1~2분 기다리세요.
          </p>
          <p>
            <strong>Edge Function CORS</strong>는 함수가 배포되지 않았을 때 같이 보일 수 있습니다. 스키마 적용 후{" "}
            <code className="bg-background/80 px-1 rounded">supabase functions deploy …</code> 로 배포하세요.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SchemaSetupBanner;
