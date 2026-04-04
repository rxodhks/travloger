import { motion } from "framer-motion";
import { Compass, Calendar, MapPin, Image as ImageIcon, ChevronRight, Users, Sparkles, Heart, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { HomePageSkeleton } from "@/components/ui/page-skeleton";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface Memory {
  id: string;
  content: string | null;
  mood: string | null;
  location: string | null;
  photo_urls: string[] | null;
  created_at: string;
}

interface GroupInfo {
  id: string;
  name: string;
  type: string;
  memberCount: number;
}

const quickActions = [
  { icon: Calendar, label: "여행 계획", path: "/trip-plan", color: "bg-primary/10 text-primary" },
  { icon: MapPin, label: "체크인", path: "/map", color: "bg-accent/10 text-accent" },
  { icon: ImageIcon, label: "기록하기", path: "/create", color: "bg-terracotta/10 text-terracotta" },
];

const getMoodEmoji = (mood: string | null) => {
  const moods: Record<string, string> = {
    happy: "😊", love: "💕", excited: "🎉", peaceful: "😌", sad: "😢", angry: "😤",
  };
  return mood ? moods[mood] || "📝" : "📝";
};

const fetchHomeData = async (userId: string) => {
  const [memoriesRes, countRes, coupleRes, membershipsRes] = await Promise.all([
    supabase.from("memories").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("memories").select("*", { count: "exact", head: true }),
    supabase.from("couples").select("*").or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle(),
    supabase.from("group_members").select("group_id").eq("user_id", userId),
  ]);

  const memories = (memoriesRes.data || []) as Memory[];
  const totalPhotos = memories.reduce((sum, m) => sum + (m.photo_urls?.length || 0), 0);
  const totalLocations = new Set(memories.filter(m => m.location).map(m => m.location)).size;
  const stats = { totalMemories: countRes.count ?? memories.length, totalPhotos, totalLocations };
  const couple = coupleRes.data;

  let groups: GroupInfo[] = [];
  const memberships = membershipsRes.data;
  if (memberships && memberships.length > 0) {
    const groupIds = memberships.map(m => m.group_id);
    const [groupsRes, ...memberCounts] = await Promise.all([
      supabase.from("groups").select("*").in("id", groupIds),
      ...groupIds.map(gid =>
        supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", gid)
      ),
    ]);
    if (groupsRes.data) {
      groups = groupsRes.data.map((g, i) => ({
        id: g.id, name: g.name, type: g.type,
        memberCount: memberCounts[i]?.count ?? 0,
      }));
    }
  }

  return { memories, stats, couple, groups };
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { limits } = usePremiumStatus();

  const { data, isLoading } = useQuery({
    queryKey: ["home-data", user?.id],
    queryFn: () => fetchHomeData(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading || !data) return <HomePageSkeleton />;

  const { memories, stats, couple, groups } = data;

  return (
    <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">안녕하세요 👋</p>
              <h1 className="text-2xl font-bold text-foreground font-display tracking-tight">
                우리의 <span className="text-primary">기록장</span>
              </h1>
            </div>
            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/notifications")}>
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-5 mb-6 p-5 rounded-2xl bg-card border border-border shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">활동 요약</span>
        </div>
        <div className="flex justify-between">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground font-display">{stats.totalMemories}</p>
            <p className="text-xs text-muted-foreground">기록</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground font-display">{stats.totalLocations}</p>
            <p className="text-xs text-muted-foreground">장소</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground font-display">{stats.totalPhotos}</p>
            <p className="text-xs text-muted-foreground">사진</p>
          </div>
        </div>
      </motion.div>

      {(couple || groups.length > 0) && (
        <div className="px-5 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">내 그룹</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {couple && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12 }}
                onClick={() => navigate("/couple")}
                className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow min-w-[160px]"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">연인</p>
                  <p className="text-xs text-muted-foreground">
                    {couple.status === "connected" ? "연결됨" : "대기중"}
                  </p>
                </div>
              </motion.button>
            )}
            {groups.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.14 + i * 0.05 }}
                onClick={() => navigate("/friends")}
                className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow min-w-[160px]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground truncate max-w-[100px]">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.memberCount}/{limits.maxGroupMembers}명</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 mb-8">
        <div className="flex gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              onClick={() => navigate(action.path)}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-2.5 rounded-xl ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">최근 기록</h2>
          <button onClick={() => navigate("/diary")} className="text-sm text-primary flex items-center gap-1">
            전체보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {memories.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <Compass className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">아직 기록이 없어요</p>
            <button onClick={() => navigate("/create")} className="text-sm text-primary mt-2 font-medium">
              첫 기록 남기기 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory, i) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
              >
                <Card className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/memory/${memory.id}`)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                      {getMoodEmoji(memory.mood)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate text-sm">
                        {memory.content?.slice(0, 20) || "무제"}
                        {(memory.content?.length ?? 0) > 20 ? "..." : ""}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(memory.created_at).toLocaleDateString("ko-KR")}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {memory.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {memory.location}
                          </span>
                        )}
                        {(memory.photo_urls?.length ?? 0) > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> {memory.photo_urls!.length}장
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
