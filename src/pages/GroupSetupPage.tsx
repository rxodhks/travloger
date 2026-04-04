import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const GroupSetupPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="absolute top-20 w-64 h-64 rounded-full bg-accent/8 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">누구와 함께할까요?</h1>
          <p className="text-muted-foreground text-sm">
            함께 추억을 기록할 그룹 유형을 선택하세요
          </p>
        </div>

        <div className="space-y-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/couple-setup")}
            className="w-full p-6 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow text-left flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Heart className="w-7 h-7 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-lg">연인 💕</h3>
              <p className="text-sm text-muted-foreground mt-1">
                둘만의 비밀 공간을 만들어요
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/friend-setup")}
            className="w-full p-6 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow text-left flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-lg">친구 👫</h3>
              <p className="text-sm text-muted-foreground mt-1">
                친구들과 함께 추억을 공유해요
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </motion.button>
        </div>

        <Button
          variant="ghost"
          onClick={() => navigate("/home")}
          className="w-full mt-6 text-muted-foreground"
        >
          나중에 하기
        </Button>
      </motion.div>
    </div>
  );
};

export default GroupSetupPage;
