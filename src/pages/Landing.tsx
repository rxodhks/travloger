import { motion } from "framer-motion";
import { Compass, MapPin, Camera, Shield, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const features = [
  { icon: Compass, title: "함께한 여정", desc: "지도 위에 우리만의 발자취를 남기세요", color: "text-primary" },
  { icon: Camera, title: "프라이빗 앨범", desc: "소중한 순간을 안전하게 공유하세요", color: "text-terracotta" },
  { icon: Shield, title: "완전 폐쇄형", desc: "초대된 멤버만 접근할 수 있는 공간", color: "text-accent" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/home");
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Abstract shapes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 1 }}
          className="absolute top-16 -left-10 w-72 h-72 rounded-full bg-primary/8 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute bottom-24 right-0 w-56 h-56 rounded-full bg-accent/8 blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 text-primary text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            우리만의 프라이빗 공간
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6 tracking-tight">
            소중한 순간을
            <br />
            <span className="text-primary">함께</span> 기록하다
          </h1>

          <p className="text-muted-foreground text-base max-w-sm mx-auto mb-10 leading-relaxed">
            연인, 친구들과 함께하는 완전 폐쇄형
            <br />
            여행·일상 기록 서비스
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
            >
              시작하기
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/auth")}
              className="rounded-full px-8 text-base"
            >
              둘러보기
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-lg mx-auto space-y-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm"
            >
              <div className={`p-3 rounded-xl bg-muted ${f.color}`}>
                <f.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Landing;
