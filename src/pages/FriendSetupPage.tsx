import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Copy, Check, Link2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const FriendSetupPage = () => {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [groupName, setGroupName] = useState("");
  const [myCode, setMyCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { limits } = usePremiumStatus();

  const handleCreate = async () => {
    if (!user || !groupName.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({ owner_id: user.id, name: groupName.trim() })
        .select("id, invite_code")
        .single();

      if (error) throw error;

      // Add owner as member
      await supabase
        .from("group_members")
        .insert({ group_id: data.id, user_id: user.id });

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
      const { data: group, error: findError } = await supabase
        .from("groups")
        .select("*")
        .eq("invite_code", joinCode.trim())
        .maybeSingle();

      if (findError) throw findError;
      if (!group) {
        toast({ title: "코드를 찾을 수 없어요", description: "올바른 초대 코드를 입력해주세요.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Check group member limit (free: 5)
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id);

      if ((count ?? 0) >= limits.maxGroupMembers) {
        toast({ title: "그룹이 가득 찼어요", description: `이 그룹은 최대 ${limits.maxGroupMembers}명까지 가능합니다. ${limits.maxGroupMembers === 5 ? '프리미엄으로 업그레이드하세요!' : ''}`, variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: user.id });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "이미 참여 중이에요!", description: "이 그룹에 이미 속해 있습니다." });
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      toast({ title: "그룹 참여 완료! 🎉", description: `'${group.name}' 그룹에 합류했어요!` });
      navigate("/friends");
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
      <div className="absolute top-20 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">친구 그룹 만들기</h1>
          <p className="text-muted-foreground text-sm mt-2">
            친구들과 함께 추억을 기록하세요
          </p>
        </div>

        {mode === "choose" && (
          <div className="space-y-4">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="그룹 이름 (예: 절친 모임)"
              className="rounded-xl bg-card h-14 text-center text-base"
              maxLength={30}
            />
            <Button
              onClick={handleCreate}
              disabled={loading || !groupName.trim()}
              className="w-full h-14 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  그룹 만들기
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setMode("join")}
              className="w-full h-14 rounded-xl text-base"
            >
              <Link2 className="w-5 h-5 mr-2" />
              초대 코드로 참여하기
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/group-setup")}
              className="w-full text-muted-foreground"
            >
              뒤로가기
            </Button>
          </div>
        )}

        {mode === "create" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/60 text-center">
              <p className="text-sm text-muted-foreground mb-3">아래 코드를 친구들에게 보내주세요</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold tracking-widest text-primary font-mono">{myCode}</span>
                <button onClick={copyCode} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  {copied ? <Check className="w-5 h-5 text-sage" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              친구들이 이 코드를 입력하면 자동으로 그룹에 참여합니다 🎉
            </p>

            <Button onClick={() => navigate("/friends")} className="w-full h-12 rounded-xl">
              친구 그룹으로 이동
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
                  참여하기
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

export default FriendSetupPage;
