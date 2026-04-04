import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useNavigate } from "react-router-dom";

interface ShareableDiaryProps {
  memoryId?: string;
}

const ShareMemoryButton = ({ memoryId }: ShareableDiaryProps) => {
  const [copied, setCopied] = useState(false);
  const { isPremium, loading } = usePremiumStatus();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Don't render anything while loading or if not premium
  if (loading || !isPremium) return null;

  const handleShare = async () => {
    if (!isPremium) {
      navigate("/premium");
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${memoryId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "우리의 추억",
          text: "함께한 추억을 확인해보세요! 💕",
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "링크가 복사되었습니다! 🔗" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleShare(); }}
      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
      title="공유하기"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
};

export default ShareMemoryButton;
