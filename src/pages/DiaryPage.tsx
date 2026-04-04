import { motion } from "framer-motion";
import { BookOpen, Calendar, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ShareMemoryButton from "@/components/premium/ShareMemoryPage";
import { useQuery } from "@tanstack/react-query";

interface Memory {
  id: string;
  content: string | null;
  mood: string | null;
  location: string | null;
  photo_urls: string[] | null;
  created_at: string;
  user_id: string | null;
}

const getMoodEmoji = (mood: string | null) => {
  const moods: Record<string, string> = {
    happy: "😊", love: "💕", excited: "🎉", peaceful: "😌", sad: "😢", angry: "😤",
  };
  return mood ? moods[mood] || "📝" : "📝";
};

const DiaryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: memories = [], isLoading: loading } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("memories")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Memory[];
    },
    enabled: !!user,
  });

  const myMemories = memories.filter((m) => m.user_id === user?.id);
  const otherMemories = memories.filter((m) => m.user_id !== user?.id);

  return (
    <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
      <div className="px-5 pt-12 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground font-display tracking-tight"
        >
          다이어리 📖
        </motion.h1>
      </div>

      <div className="px-5">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full rounded-xl bg-muted mb-6">
            <TabsTrigger value="all" className="flex-1 rounded-lg">전체</TabsTrigger>
            <TabsTrigger value="mine" className="flex-1 rounded-lg">내 기록</TabsTrigger>
            <TabsTrigger value="others" className="flex-1 rounded-lg">멤버</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">아직 기록이 없어요</p>
              <p className="text-xs text-muted-foreground mt-1">기록 탭에서 첫 기록을 남겨보세요!</p>
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4">
                {memories.map((entry, i) => (
                  <DiaryCard key={entry.id} entry={entry} index={i} isOwn={entry.user_id === user?.id} onClick={() => navigate(`/memory/${entry.id}`)} />
                ))}
              </TabsContent>
              <TabsContent value="mine" className="space-y-4">
                {myMemories.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">내 기록이 없어요</p>
                ) : myMemories.map((entry, i) => (
                  <DiaryCard key={entry.id} entry={entry} index={i} isOwn onClick={() => navigate(`/memory/${entry.id}`)} />
                ))}
              </TabsContent>
              <TabsContent value="others" className="space-y-4">
                {otherMemories.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">멤버의 기록이 없어요</p>
                ) : otherMemories.map((entry, i) => (
                  <DiaryCard key={entry.id} entry={entry} index={i} isOwn={false} onClick={() => navigate(`/memory/${entry.id}`)} />
                ))}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

const DiaryCard = ({ entry, index, isOwn, onClick }: { entry: Memory; index: number; isOwn: boolean; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06 }}
  >
    <Card className="border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {entry.photo_urls && entry.photo_urls.length > 0 && (
        <div className="flex gap-1 overflow-x-auto p-2 pb-0">
          {entry.photo_urls.slice(0, 3).map((url, i) => (
            <img key={i} src={url} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0" loading="lazy" />
          ))}
          {entry.photo_urls.length > 3 && (
            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center shrink-0 text-sm text-muted-foreground">
              +{entry.photo_urls.length - 3}
            </div>
          )}
        </div>
      )}

      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {entry.content?.slice(0, 25) || "무제"}
              {(entry.content?.length ?? 0) > 25 ? "..." : ""}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(entry.created_at).toLocaleDateString("ko-KR")}
              <span className="px-1.5 py-0.5 rounded-md bg-muted text-xs">
                {isOwn ? "나" : "멤버"}
              </span>
            </div>
          </div>
          <ShareMemoryButton memoryId={entry.id} />
        </div>
        {entry.content && (
          <p className="text-sm text-foreground/80 leading-relaxed mb-2 line-clamp-2">{entry.content}</p>
        )}
        {entry.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {entry.location}
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default DiaryPage;
