import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface MapTheme {
  id: string;
  name: string;
  premium: boolean;
  styles: google.maps.MapTypeStyle[];
}

export const mapThemes: MapTheme[] = [
  { id: "default", name: "기본", premium: false, styles: [] },
  { id: "dark", name: "다크", premium: false, styles: [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  ]},
  { id: "retro", name: "레트로", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f1e6" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b9d3c2" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#a5b076" }] },
  ]},
  { id: "night", name: "나이트", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
  ]},
  { id: "pastel", name: "파스텔", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#f5f0eb" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c9e4f0" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#d4e9c7" }] },
    { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f2e8de" }] },
  ]},
  { id: "ocean", name: "오션", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#e8f4f8" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#4fb3bf" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#b5e8d5" }] },
  ]},
  { id: "sunset", name: "선셋", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#2c1810" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#d4a574" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#1a1a2e" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#4a2c1a" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#2d3a1a" }] },
  ]},
  { id: "forest", name: "포레스트", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#f0f4e8" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#8ab4c0" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#e8dfc8" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#8fbc8f" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#d4e8c0" }] },
  ]},
  { id: "mono", name: "모노", premium: true, styles: [
    { elementType: "geometry", stylers: [{ saturation: -100 }] },
    { elementType: "labels", stylers: [{ saturation: -100 }] },
  ]},
  { id: "candy", name: "캔디", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#fff0f5" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b8d4e3" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffdde1" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#c8e6c9" }] },
  ]},
  { id: "vintage", name: "빈티지", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#6b4226" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#87a9b5" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#c9b38c" }] },
  ]},
  { id: "arctic", name: "아틱", premium: true, styles: [
    { elementType: "geometry", stylers: [{ color: "#e8f0f8" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#a8c8e8" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f0f4f8" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#d8e8f0" }] },
  ]},
];

interface ThemeSelectorProps {
  isPremium: boolean;
  currentThemeId: string;
  onSelectTheme: (theme: MapTheme) => void;
}

const ThemeSelector = ({ isPremium, currentThemeId, onSelectTheme }: ThemeSelectorProps) => {
  const navigate = useNavigate();

  const handleSelect = (theme: MapTheme) => {
    if (theme.premium && !isPremium) {
      navigate("/premium");
      return;
    }
    onSelectTheme(theme);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {mapThemes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => handleSelect(theme)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border relative ${
            currentThemeId === theme.id
              ? "bg-primary text-primary-foreground border-primary"
              : theme.premium && !isPremium
              ? "bg-muted/50 text-muted-foreground border-border/40 opacity-60"
              : "bg-card text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          {theme.name}
          {theme.premium && !isPremium && (
            <Crown className="w-2.5 h-2.5 text-yellow-500 inline ml-1" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
