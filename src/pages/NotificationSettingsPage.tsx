import { motion } from "framer-motion";
import { ArrowLeft, Bell, MapPin, BookOpen, Users, Plane, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface NotifPrefs {
  checkin_notify: boolean;
  memory_notify: boolean;
  member_join_notify: boolean;
  trip_plan_notify: boolean;
}

const defaultPrefs: NotifPrefs = {
  checkin_notify: true,
  memory_notify: true,
  member_join_notify: true,
  trip_plan_notify: true,
};

function isMissingNotificationPrefsTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const m = (error.message || "").toLowerCase();
  return (
    m.includes("notification_preferences") &&
    (m.includes("schema cache") || m.includes("does not exist") || m.includes("could not find"))
  );
}

const notifItems = [
  { key: "checkin_notify" as const, icon: MapPin, label: "체크인 알림", desc: "그룹 멤버의 새 체크인" },
  { key: "memory_notify" as const, icon: BookOpen, label: "추억 알림", desc: "새로운 추억 기록" },
  { key: "member_join_notify" as const, icon: Users, label: "멤버 참가 알림", desc: "새 멤버 그룹 참가" },
  { key: "trip_plan_notify" as const, icon: Plane, label: "여행 계획 알림", desc: "새로운 여행 계획" },
];

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error && isMissingNotificationPrefsTable(error)) {
        setTableMissing(true);
        setLoading(false);
        return;
      }
      if (data) {
        setPrefs({
          checkin_notify: (data as any).checkin_notify,
          memory_notify: (data as any).memory_notify,
          member_join_notify: (data as any).member_join_notify,
          trip_plan_notify: (data as any).trip_plan_notify,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updatePref = async (key: keyof NotifPrefs, value: boolean) => {
    if (!user || tableMissing) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...updated } as any, { onConflict: "user_id" });

    if (error) {
      if (isMissingNotificationPrefsTable(error)) {
        setTableMissing(true);
        toast({
          title: "DB 테이블 없음",
          description: "Supabase에 notification_preferences 테이블을 생성해야 합니다.",
          variant: "destructive",
        });
      } else {
        toast({ title: "설정 저장 실패", variant: "destructive" });
      }
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground font-display">알림 설정</h1>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/notifications")}>
              <Bell className="w-3.5 h-3.5 mr-1" /> 알림 보기
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : tableMissing ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>알림 설정 DB가 아직 없습니다</AlertTitle>
              <AlertDescription className="text-sm mt-2 space-y-2">
                <p>
                  Supabase REST가 <code className="text-xs bg-muted px-1 rounded">notification_preferences</code> 테이블을
                  찾지 못해 404가 납니다. 아래 중 하나로 해결할 수 있습니다.
                </p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>
                    Supabase 대시보드 → <strong>SQL Editor</strong>에서 저장소의{" "}
                    <code className="text-xs">supabase/snippets/ensure_notification_preferences.sql</code> 내용을 붙여
                    넣고 실행
                  </li>
                  <li>
                    또는 로컬에서 <code className="text-xs">supabase db push</code>로 전체 마이그레이션 적용
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {notifItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <item.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs[item.key]}
                    onCheckedChange={(v) => updatePref(item.key, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
