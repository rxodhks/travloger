import { motion } from "framer-motion";
import { ArrowLeft, Bell, MapPin, BookOpen, Users, Plane, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
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
    if (!user) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...updated } as any, { onConflict: "user_id" });

    if (error) {
      toast({ title: "설정 저장 실패", variant: "destructive" });
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
