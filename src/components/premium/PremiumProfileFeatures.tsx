import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Extended emoji set for premium users
export const premiumEmojis = [
  "😊", "😎", "🤗", "🥰", "😺", "🐻", "🌸", "⭐", "🔥", "💎", "🎵", "🍀",
  // Premium extras
  "🦊", "🐼", "🦋", "🌈", "🎭", "🎪", "🏰", "🚀", "🌙", "🍂",
  "🎯", "🎨", "🧊", "🌺", "🍭", "🎐", "🪐", "🦄", "🐚", "🌊",
  "🗻", "🌴", "🏝️", "🎡", "🎠", "🧸", "🪷", "🫧", "✨", "💫",
];

export const basicEmojis = ["😊", "😎", "🤗", "🥰", "😺", "🐻", "🌸", "⭐", "🔥", "💎", "🎵", "🍀"];

export const PremiumBadge = () => (
  <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 gap-1 text-[10px] px-2 py-0.5 shadow-sm">
    <Crown className="w-3 h-3" /> PREMIUM
  </Badge>
);
