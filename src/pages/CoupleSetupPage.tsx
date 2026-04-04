import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Copy, Check, Link2, ArrowRight, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CoupleSetupPage = () => {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [inviteCode, setInviteCode] = useState("");
  const [myCode, setMyCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if already in a couple
  useEffect(() => {
    const checkCouple = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("couples")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq("status", "connected")
        .maybeSingle();

      if (data) navigate("/home");
    };
    checkCouple();
  }, [user, navigate]);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("couples")
        .insert({ user1_id: user.id })
        .select("invite_code")
        .single();

      if (error) throw error;
      setMyCode(data.invite_code);
      setMode("create");
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    setLoading(true);
    try {
      // Find the couple with this invite code
      const { data: couple, error: findError } = await supabase
        .from("couples")
        .select("*")
        .eq("invite_code", joinCode.trim())
        .eq("status", "pending")
        .maybeSingle();

      if (findError) throw findError;
      if (!couple) {
        toast({ title: "코드를 찾을 수 없어요", description: "올바른 초대 코드를 입력해주세요.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (couple.user1_id === user.id) {
        toast({ title: "본인의 코드예요!", description: "상대방에게 코드를 공유해주세요.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("couples")
        .update({ user2_id: user.id, status: "connected" })
        .eq("id", couple.id);

      if (error) throw error;

      toast({ title: "커플 연결 완료! 💕", description: "이제 함께 추억을 기록해보세요!" });
      navigate("/home");
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="absolute top-20 w-64 h-64 rounded-full bg-accent/8 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary mb-4">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">커플 연결하기</h1>
          <p className="text-muted-foreground text-sm mt-2">
            상대방과 연결하여 둘만의 공간을 만들어보세요
          </p>
        </div>

        {mode === "choose" && (
          <div className="space-y-4">
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full h-14 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Heart className="w-5 h-5 mr-2" />
                  초대 코드 만들기
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setMode("join")}
              className="w-full h-14 rounded-xl text-base"
            >
              <Link2 className="w-5 h-5 mr-2" />
              초대 코드로 연결하기
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              className="w-full text-muted-foreground"
            >
              나중에 하기
            </Button>
          </div>
        )}

        {mode === "create" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/60 text-center">
              <p className="text-sm text-muted-foreground mb-3">아래 코드를 상대방에게 보내주세요</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold tracking-widest text-primary font-mono">{myCode}</span>
                <button onClick={copyCode} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  {copied ? <Check className="w-5 h-5 text-sage" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              상대방이 이 코드를 입력하면 자동으로 연결됩니다 💕
            </p>

            <Button variant="ghost" onClick={() => navigate("/home")} className="w-full text-muted-foreground">
              홈으로 이동
            </Button>
          </motion.div>
        )}

        {mode === "join" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="초대 코드 입력"
              className="rounded-xl bg-card h-14 text-center text-xl tracking-widest font-mono"
              maxLength={8}
            />

            <Button
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  연결하기
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={() => setMode("choose")} className="w-full text-muted-foreground">
              뒤로가기
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CoupleSetupPage;
