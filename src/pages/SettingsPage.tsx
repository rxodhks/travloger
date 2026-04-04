import { motion } from "framer-motion";
import { ArrowLeft, Moon, Sun, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { appThemes, applyTheme, getStoredThemeId } from "@/lib/themes";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [currentThemeId, setCurrentThemeId] = useState(getStoredThemeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    // Re-apply current theme when dark mode toggles
    applyTheme(currentThemeId);
  }, [isDark, currentThemeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleSelectTheme = (themeId: string) => {
    const theme = appThemes.find((t) => t.id === themeId);
    if (!theme) return;
    if (theme.premium && !isPremium) {
      navigate("/premium");
      return;
    }
    setCurrentThemeId(themeId);
    applyTheme(themeId);
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground font-display">앱 설정</h1>
          </div>

          {/* Dark mode */}
          <div className="space-y-3 mb-8">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">테마</p>
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  {isDark ? <Moon className="w-5 h-5 text-foreground" /> : <Sun className="w-5 h-5 text-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">다크 모드</p>
                  <p className="text-xs text-muted-foreground">어두운 테마로 전환합니다</p>
                </div>
              </div>
              <Switch checked={isDark} onCheckedChange={setIsDark} />
            </div>
          </div>

          {/* Color theme selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">디자인 색상</p>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3" /> PREMIUM
              </span>
            </div>

            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto overflow-y-hidden pb-3 -mx-5 px-5"
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {appThemes.map((theme) => {
                const isSelected = theme.id === currentThemeId;
                const isLocked = theme.premium && !isPremium;
                const previewVars = isDark ? theme.dark : theme.light;

                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`relative shrink-0 w-[140px] rounded-2xl border-2 transition-all overflow-hidden ${
                      isSelected
                        ? "border-primary shadow-lg scale-[1.02]"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {/* Preview card */}
                    <div
                      className="p-3 space-y-2"
                      style={{ backgroundColor: `hsl(${previewVars["--background"]})` }}
                    >
                      {/* Mini header */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: `hsl(${previewVars["--primary"]})` }}
                        >
                          <span className="text-[10px]">{theme.emoji}</span>
                        </div>
                        <div
                          className="h-2 w-12 rounded-full"
                          style={{ backgroundColor: `hsl(${previewVars["--foreground"]})`, opacity: 0.7 }}
                        />
                      </div>

                      {/* Mini card */}
                      <div
                        className="rounded-lg p-2 space-y-1.5"
                        style={{
                          backgroundColor: `hsl(${previewVars["--card"]})`,
                          border: `1px solid hsl(${previewVars["--border"]})`,
                        }}
                      >
                        <div
                          className="h-1.5 w-14 rounded-full"
                          style={{ backgroundColor: `hsl(${previewVars["--foreground"]})`, opacity: 0.6 }}
                        />
                        <div
                          className="h-1.5 w-10 rounded-full"
                          style={{ backgroundColor: `hsl(${previewVars["--muted-foreground"]})`, opacity: 0.5 }}
                        />
                      </div>

                      {/* Mini buttons */}
                      <div className="flex gap-1.5">
                        <div
                          className="h-4 flex-1 rounded-md"
                          style={{ backgroundColor: `hsl(${previewVars["--primary"]})` }}
                        />
                        <div
                          className="h-4 flex-1 rounded-md"
                          style={{ backgroundColor: `hsl(${previewVars["--muted"]})` }}
                        />
                      </div>
                    </div>

                    {/* Label */}
                    <div
                      className="px-3 py-2 text-center"
                      style={{ backgroundColor: `hsl(${previewVars["--card"]})` }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: `hsl(${previewVars["--foreground"]})` }}
                      >
                        {theme.emoji} {theme.name}
                      </p>
                    </div>

                    {/* Lock overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}

                    {/* Selected check */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[10px] text-primary-foreground">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
