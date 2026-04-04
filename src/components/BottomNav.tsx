import { Home, MapPin, PlusCircle, BookOpen, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "홈", path: "/home" },
  { icon: MapPin, label: "지도", path: "/map" },
  { icon: PlusCircle, label: "기록", path: "/create" },
  { icon: BookOpen, label: "다이어리", path: "/diary" },
  { icon: User, label: "프로필", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-3xl mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isCreate = item.path === "/create";

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors relative flex-1",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isCreate ? (
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 -mt-4">
                  <PlusCircle className="w-6 h-6" />
                </div>
              ) : (
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              )}
              <span className={cn("text-[10px]", isCreate && "mt-0.5", isActive && "font-semibold")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
