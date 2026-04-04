import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, BellOff, Check, MapPin, BookOpen, Users, Plane, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListPageSkeleton } from "@/components/ui/page-skeleton";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  checkin: <MapPin className="w-4 h-4" />,
  memory: <BookOpen className="w-4 h-4" />,
  member_join: <Users className="w-4 h-4" />,
  trip_plan: <Plane className="w-4 h-4" />,
  general: <Bell className="w-4 h-4" />,
};

const typeColor: Record<string, string> = {
  checkin: "bg-primary/15 text-primary",
  memory: "bg-accent/15 text-accent",
  member_join: "bg-secondary text-secondary-foreground",
  trip_plan: "bg-destructive/15 text-destructive",
  general: "bg-muted text-muted-foreground",
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as Notification[]) || [];
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.setQueryData<Notification[]>(["notifications", user?.id], (old) =>
      old?.map((n) => (n.id === id ? { ...n, is_read: true } : n)) ?? []
    );
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.setQueryData<Notification[]>(["notifications", user.id], (old) =>
      old?.map((n) => ({ ...n, is_read: true })) ?? []
    );
    toast({ title: "모든 알림을 읽음 처리했습니다" });
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    queryClient.setQueryData<Notification[]>(["notifications", user?.id], (old) =>
      old?.filter((n) => n.id !== id) ?? []
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground font-display">알림</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 mr-1" /> 모두 읽음
              </Button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <BellOff className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">아직 알림이 없습니다</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`p-4 cursor-pointer transition-all border ${
                      n.is_read ? "bg-card border-border opacity-70" : "bg-card border-primary/20 shadow-sm"
                    }`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${typeColor[n.type] || typeColor.general}`}>
                        {typeIcon[n.type] || typeIcon.general}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 w-7 h-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ko })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
