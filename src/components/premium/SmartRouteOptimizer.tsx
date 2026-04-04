import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Route, Loader2, Crown, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { postOptimizeRoute } from "@/lib/aiApi";
import { useNavigate } from "react-router-dom";

interface RouteTip {
  from: string;
  to: string;
  tip: string;
}

interface RouteResult {
  optimized: string[];
  tips: RouteTip[];
  summary: string;
}

interface SmartRouteOptimizerProps {
  isPremium: boolean;
  places: string[];
  tripId: string;
  onApply: (optimizedPlaces: string[]) => void;
}

const SmartRouteOptimizer = ({ isPremium, places, tripId, onApply }: SmartRouteOptimizerProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const navigate = useNavigate();

  const handleOptimize = async () => {
    if (!isPremium) {
      navigate("/premium");
      return;
    }
    if (places.length < 2) return;

    setLoading(true);
    setResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("로그인이 필요합니다.");
      const data = await postOptimizeRoute(places, session.access_token);
      setResult(data as RouteResult);
    } catch (err: any) {
      console.error("Route optimization error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result?.optimized) {
      onApply(result.optimized);
      setResult(null);
    }
  };

  if (places.length < 2) return null;

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleOptimize}
        disabled={loading}
        className="w-full rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Route className="w-4 h-4" />
        )}
        {loading ? "동선 분석 중..." : "스마트 동선 최적화"}
        {!isPremium && (
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/15 text-primary font-semibold">
            PREMIUM
          </span>
        )}
      </Button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                {/* Summary */}
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  {result.summary}
                </p>

                {/* Optimized order */}
                <div className="space-y-1.5">
                  {result.optimized.map((place, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm text-foreground">{place}</span>
                      {i < result.optimized.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Tips */}
                {result.tips && result.tips.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> 이동 팁
                    </p>
                    {result.tips.map((tip, i) => (
                      <div key={i} className="text-xs text-muted-foreground bg-background/60 rounded-lg p-2">
                        <span className="font-medium text-foreground">{tip.from} → {tip.to}</span>
                        <span className="ml-1">: {tip.tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Apply button */}
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="w-full rounded-xl gap-2"
                >
                  <Route className="w-4 h-4" />
                  이 순서로 적용하기
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartRouteOptimizer;
