import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, MapPin, Smile, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const moods = ["😊", "🥰", "😍", "🤗", "😌", "🥺", "😋", "🤩"];

interface PhotoPreview {
  file: File;
  preview: string;
}

const CreatePage = () => {
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium, limits } = usePremiumStatus();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 9 - photos.length;
    const selected = files.slice(0, remaining);

    const newPhotos: PhotoPreview[] = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];

    for (const photo of photos) {
      const ext = photo.file.name.split(".").pop() || "jpg";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `public/${fileName}`;

      const { error } = await supabase.storage
        .from("photos")
        .upload(filePath, photo.file, { contentType: photo.file.type });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);

      urls.push(urlData.publicUrl);
    }

    return urls;
  };

  const handleSubmit = async () => {
    if (!content.trim() && photos.length === 0) {
      toast({ title: "내용이나 사진을 추가해주세요", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      // Check monthly photo upload limit (free: 50)
      if (photos.length > 0) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const { data: monthMemories } = await supabase
            .from("memories")
            .select("photo_urls")
            .eq("user_id", currentUser.id)
            .gte("created_at", startOfMonth);

          const monthlyCount = (monthMemories || []).reduce(
            (sum, m) => sum + (m.photo_urls?.length || 0), 0
          );

          if (!isPremium && monthlyCount + photos.length > limits.maxMonthlyPhotos) {
            toast({
              title: "월간 사진 한도 초과",
              description: `이번 달 ${monthlyCount}/${limits.maxMonthlyPhotos}장 사용. 프리미엄으로 업그레이드하면 무제한 업로드가 가능합니다!`,
              variant: "destructive",
            });
            setIsUploading(false);
            return;
          }
        }
      }

      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("memories").insert({
        content: content.trim() || null,
        mood: selectedMood,
        location: location.trim() || null,
        photo_urls: photoUrls,
        user_id: user?.id,
      });

      if (error) throw error;

      // Clean up previews
      photos.forEach((p) => URL.revokeObjectURL(p.preview));

      toast({
        title: "기록이 저장되었어요! 💕",
        description: `${photoUrls.length > 0 ? `사진 ${photoUrls.length}장과 함께 ` : ""}우리의 추억이 하나 더 쌓였습니다.`,
      });
      navigate("/home");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "저장에 실패했어요 😢",
        description: err.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          새로운 기록 ✍️
        </motion.h1>
      </div>

      <div className="px-5 space-y-6">
        {/* Photo Upload */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label className="text-sm font-medium text-foreground mb-2 block">사진</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence>
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.preview}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border/60"
                >
                  <img
                    src={photo.preview}
                    alt={`미리보기 ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {photos.length < 9 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">{photos.length === 0 ? "사진 추가" : `${photos.length}/9`}</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="text-sm font-medium text-foreground mb-2 block">오늘의 기록</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘의 이야기를 들려주세요..."
            className="min-h-[120px] rounded-xl bg-card resize-none"
          />
        </motion.div>

        {/* Mood */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1">
            <Smile className="w-4 h-4" /> 오늘의 기분
          </label>
          <div className="flex gap-2 flex-wrap">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood === selectedMood ? null : mood)}
                className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                  selectedMood === mood
                    ? "bg-primary/15 border-2 border-primary scale-110"
                    : "bg-muted border border-border/60 hover:scale-105"
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Location */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1">
            <MapPin className="w-4 h-4" /> 장소
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="어디에서의 기록인가요?"
            className="rounded-xl bg-card"
          />
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={handleSubmit}
            disabled={isUploading}
            className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-primary/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                기록 저장하기
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default CreatePage;
