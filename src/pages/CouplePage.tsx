import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2, Copy, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CouplePage = () => {
  const [couple, setCouple] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCouple = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("couples")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle();

      if (data) {
        setCouple(data);
        const partnerId = data.user1_id === user.id ? data.user2_id : data.user1_id;
        if (partnerId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", partnerId)
            .maybeSingle();
          setPartnerProfile(profile);
        }
      }
      setLoading(false);
    };
    fetchCouple();
  }, [user]);

  const copyCode = () => {
    if (!couple) return;
    navigator.clipboard.writeText(couple.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!couple) return;
    const { error } = await supabase.from("couples").delete().eq("id", couple.id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "커플 연결이 해제되었습니다" });
      setCouple(null);
      setPartnerProfile(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground mb-1">연인 관리 💕</p>
          <h1 className="text-2xl font-bold text-foreground mb-6">커플 스페이스</h1>
        </motion.div>

        {!couple ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-4xl">
              💕
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">아직 연결되지 않았어요</h3>
            <p className="text-sm text-muted-foreground mb-6">연인과 초대 코드로 연결해보세요!</p>
            <Button onClick={() => navigate("/couple-setup")} className="rounded-xl">
              <Heart className="w-4 h-4 mr-2" />
              커플 연결하기
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl">😊</div>
                    <Heart className="w-6 h-6 text-accent fill-accent animate-pulse" />
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl">
                      {partnerProfile?.avatar_emoji || "❓"}
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {couple.status === "connected"
                      ? `${partnerProfile?.display_name || "상대방"}과 연결됨`
                      : "상대방의 연결을 기다리고 있어요..."}
                  </p>
                  {couple.status === "pending" && (
                    <div className="mt-4 p-3 rounded-xl bg-muted text-center">
                      <p className="text-xs text-muted-foreground mb-1">초대 코드</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg font-bold tracking-widest text-primary font-mono">{couple.invite_code}</span>
                        <button onClick={copyCode} className="p-1 rounded hover:bg-background transition-colors">
                          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {couple.anniversary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">기념일</p>
                    <p className="text-lg font-semibold text-foreground">{couple.anniversary}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {couple.user1_id === user?.id && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  커플 연결 해제
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouplePage;
