import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, MapPin, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { postAiTravelRecommend } from "@/lib/aiApi";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  name: string;
  description: string;
  emoji: string;
  category: string;
}

interface AiTravelRecommendProps {
  isPremium: boolean;
}

const categoryColors: Record<string, string> = {
  "자연": "bg-emerald-500/15 text-emerald-600",
  "도시": "bg-blue-500/15 text-blue-600",
  "문화": "bg-purple-500/15 text-purple-600",
  "맛집": "bg-orange-500/15 text-orange-600",
  "힐링": "bg-pink-500/15 text-pink-600",
};

const AiTravelRecommend = ({ isPremium }: AiTravelRecommendProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const navigate = useNavigate();

  const fetchRecommendations = async () => {
    if (!isPremium) {
      navigate("/premium");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("로그인이 필요합니다.");
      const data = await postAiTravelRecommend(session.access_token);
      setRecommendations(data.recommendations || []);
      setHasLoaded(true);
    } catch (err) {
      console.error("AI recommend error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <Button
        onClick={fetchRecommendations}
        disabled={loading}
        variant={isPremium ? "default" : "outline"}
        className="w-full rounded-xl h-12 gap-2 relative overflow-hidden"
      >
        {!isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> AI가 분석 중...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> AI 맞춤 여행지 추천받기</>
        )}
        {!isPremium && (
          <span className="absolute top-1 right-2 text-[10px] font-bold text-yellow-500">PREMIUM</span>
        )}
      </Button>

      <AnimatePresence>
        {hasLoaded && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3"
          >
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> AI 추천 여행지
            </p>
            {recommendations.map((rec, i) => (
              <motion.div
                key={rec.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {rec.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">{rec.name}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[rec.category] || "bg-muted text-muted-foreground"}`}>
                          {rec.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiTravelRecommend;
