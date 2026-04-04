import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DetailPageSkeleton } from "@/components/ui/page-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const getMoodLabel = (mood: string | null) => {
  const labels: Record<string, string> = {
    happy: "행복", love: "사랑", excited: "신남", peaceful: "평화", sad: "슬픔", angry: "화남",
    "😊": "행복", "🥰": "사랑", "😍": "설렘", "🤗": "따뜻", "😌": "평화", "🥺": "감동", "😋": "맛있는", "🤩": "놀라운",
  };
  return mood ? labels[mood] || mood : null;
};

const MemoryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: memory, isLoading: loading } = useQuery({
    queryKey: ["memory", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error || !data) {
        toast({ title: "기록을 찾을 수 없습니다", variant: "destructive" });
        navigate(-1);
        return null;
      }
      return data as Memory;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const handleDelete = async () => {
    if (!memory) return;
    setDeleting(true);
    const { error } = await supabase.from("memories").delete().eq("id", memory.id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      setDeleting(false);
    } else {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast({ title: "기록이 삭제되었습니다 🗑️" });
      navigate(-1);
    }
  };

  if (loading) return <DetailPageSkeleton />;

  if (!memory) return null;

  const isOwn = memory.user_id === user?.id;

  return (
    <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl font-bold text-foreground font-display"
          >
            기록 상세
          </motion.h1>
        </div>
        {isOwn && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>기록을 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  삭제된 기록은 복구할 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="px-5 space-y-5">
        {/* Photos */}
        {memory.photo_urls && memory.photo_urls.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`grid gap-2 ${memory.photo_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {memory.photo_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`사진 ${i + 1}`}
                  className={`w-full rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity ${
                    memory.photo_urls!.length === 1 ? "max-h-80" : "h-44"
                  }`}
                  loading="lazy"
                  onClick={() => setSelectedPhoto(url)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Mood & Date */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{getMoodEmoji(memory.mood)}</span>
                <div>
                  {getMoodLabel(memory.mood) && (
                    <span className="text-sm font-medium text-foreground">{getMoodLabel(memory.mood)}</span>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(memory.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric", month: "long", day: "numeric", weekday: "short",
                    })}
                    {" · "}
                    {new Date(memory.created_at).toLocaleTimeString("ko-KR", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {memory.content && (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {memory.content}
                </p>
              )}

              {memory.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                  <MapPin className="w-3.5 h-3.5" />
                  {memory.location}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-center text-xs text-muted-foreground">
            {isOwn ? "내가 작성한 기록" : "멤버의 기록"}
          </p>
        </motion.div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img src={selectedPhoto} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
};

export default MemoryDetailPage;
