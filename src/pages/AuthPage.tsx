import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailTrimmed = email.trim();
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password,
        });
        if (error) throw error;
        toast({ title: "로그인 성공! ✨" });
        navigate("/home");
      } else {
        const { error } = await supabase.auth.signUp({
          email: emailTrimmed,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        toast({ title: "가입 완료! 🎉", description: "이메일 인증이 자동으로 완료되었습니다." });
        navigate("/group-setup");
      }
    } catch (err: any) {
      toast({ title: "오류가 발생했어요", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="absolute top-20 left-10 w-48 h-48 rounded-full bg-primary/6 blur-3xl" />
      <div className="absolute bottom-32 right-10 w-56 h-56 rounded-full bg-accent/6 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">우리의 기록</h1>
          <p className="text-muted-foreground text-sm mt-1">소중한 사람들과의 프라이빗 공간</p>
        </div>

        <div className="flex bg-muted rounded-xl p-1 mb-8">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="이름 또는 닉네임"
                    className="pl-10 rounded-xl bg-card h-12"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              className="pl-10 rounded-xl bg-card h-12"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              className="pl-10 rounded-xl bg-card h-12"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/15"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "로그인" : "가입하기"}
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </form>

        {!isLogin && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            가입 시 이메일 인증이 자동으로 완료됩니다 ✅
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
