import { motion } from "framer-motion";
import { Settings, Bell, History, Crown, ChevronRight, LogOut, Users, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { PremiumBadge } from "@/components/premium/PremiumProfileFeatures";
import { toast } from "sonner";

const menuItems = [
  { icon: Bell, label: "알림 설정", desc: "푸시 알림 관리", path: "/notification-settings" },
  { icon: History, label: "여행 기록", desc: "완료된 여행 계획 보관", path: "/trip-history" },
  { icon: Users, label: "그룹 관리", desc: "새 그룹 추가", path: "/group-setup" },
  { icon: Crown, label: "프리미엄", desc: "용량 확장, 커스텀 도메인", path: "/premium" },
  { icon: Settings, label: "앱 설정", desc: "테마, 언어 등", path: "/settings" },
];

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [profile, setProfile] = useState<{
    display_name: string;
    avatar_emoji: string;
    photo_url: string | null;
    background_url: string | null;
  } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_emoji, photo_url, background_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data as any);
          setNameInput(data.display_name);
        }
      });
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/profile.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(filePath);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ photo_url: photoUrl }).eq("user_id", user.id);
      setProfile((p) => (p ? { ...p, photo_url: photoUrl } : p));
      toast.success("프로필 사진이 업데이트되었습니다");
    } catch (err: any) {
      toast.error("업로드 실패: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    if (!user || !nameInput.trim()) return;
    setProfile((p) => (p ? { ...p, display_name: nameInput.trim() } : p));
    setEditingName(false);
    await supabase.from("profiles").update({ display_name: nameInput.trim() }).eq("user_id", user.id);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      {/* Background decoration - full screen */}
      {profile?.background_url && (
        <div className="fixed inset-0 z-0">
          <img src={profile.background_url} alt="" className="w-full h-full object-cover opacity-30" />
        </div>
      )}
      <div className="max-w-2xl mx-auto flex flex-col justify-center relative z-10">
        <div className="px-5 py-6 relative z-10">
          {/* Profile Photo + Name + Email */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center mb-8"
          >
            {/* Large Photo Frame */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative w-full max-w-[500px] aspect-[10/7] rounded-3xl overflow-hidden bg-muted border-2 border-border shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] group"
            >
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="프로필 사진" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                  <span className="text-4xl">{profile?.avatar_emoji || "😊"}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

            {/* Background Edit Button - Premium Only */}
            {isPremium && (
              <button
                onClick={() => navigate("/profile-background")}
                className="mt-3 px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2 mx-auto"
              >
                🎨 배경 꾸미기
              </button>
            )}

            {/* Name */}
            <div className="mt-4 text-center">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    className="text-lg font-bold text-foreground bg-transparent border-b border-primary outline-none text-center"
                    autoFocus
                    maxLength={20}
                  />
                  <Button size="sm" variant="ghost" onClick={saveName} className="text-xs text-primary">
                    저장
                  </Button>
                </div>
              ) : (
                <h1
                  onClick={() => setEditingName(true)}
                  className="text-xl font-bold text-foreground font-display cursor-pointer hover:text-primary transition-colors"
                >
                  {profile?.display_name || "내 프로필"}
                </h1>
              )}
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
                {user?.email}
                {isPremium && <PremiumBadge />}
              </p>
            </div>
          </motion.div>

          {/* Menu */}
          <div className="space-y-2">
            {menuItems.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => item.path && navigate(item.path)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-sm transition-shadow text-left"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            ))}
          </div>

          {/* Logout */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
