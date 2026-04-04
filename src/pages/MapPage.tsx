import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Plus, Heart, Users, Loader2, X, Trash2, Pencil, Check, Search, Globe, ExternalLink, Route } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import ThemeSelector, { mapThemes, type MapTheme } from "@/components/premium/PremiumMapThemes";

declare global {
  interface Window {
    naver: any;
    __naverMapReady: boolean;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyBj5y_GbV42lxpXLqWPtW_cV7EcVLpMajE";

interface Checkin {
  id: string;
  name: string;
  location: string;
  emoji: string;
  lat: number;
  lng: number;
  couple_id: string | null;
  group_id: string | null;
  created_at: string;
  user_id: string;
  map_type: string;
}

interface FilterOption {
  id: string;
  label: string;
  type: "all" | "couple" | "group" | "mine";
}

const emojiOptions = ["📍", "☕", "🍽️", "🏖️", "🎬", "🛍️", "🏯", "🧺"];
const googleMapContainerStyle = { width: "100%", height: "100%" };
const googleDefaultCenter = { lat: 35.0, lng: 100.0 };

const googleDarkStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "land", elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#023e58" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] },
];

const getPinColors = (pin: { couple_id: string | null; group_id: string | null }) => {
  if (pin.couple_id) return { main: "hsl(15, 50%, 55%)", dark: "hsl(15, 50%, 42%)" };
  if (pin.group_id) return { main: "hsl(165, 45%, 45%)", dark: "hsl(165, 45%, 35%)" };
  return { main: "hsl(220, 65%, 50%)", dark: "hsl(220, 65%, 38%)" };
};

const createPinSvgUrl = (emoji: string, mainColor: string, darkColor: string, id: string) => {
  const svg = `<svg width="42" height="54" viewBox="0 0 42 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 52C21 52 40 34 40 21C40 10.507 31.493 2 21 2C10.507 2 2 10.507 2 21C2 34 21 52 21 52Z" fill="url(%23g${id})" stroke="white" stroke-width="2"/>
    <circle cx="21" cy="21" r="11" fill="white"/>
    <text x="21" y="25" text-anchor="middle" font-size="14">${emoji}</text>
    <defs><linearGradient id="g${id}" x1="2" y1="2" x2="40" y2="52" gradientUnits="userSpaceOnUse"><stop stop-color="${mainColor}"/><stop offset="1" stop-color="${darkColor}"/></linearGradient></defs>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const smoothZoomTo = (map: any, targetZoom: number, targetLat: number, targetLng: number, isNaver: boolean) => {
  if (isNaver) {
    const coord = new window.naver.maps.LatLng(targetLat, targetLng);
    map.morph(coord, targetZoom, { duration: 500, easing: 'easeOutCubic' });
  } else {
    map.panTo({ lat: targetLat, lng: targetLng });
    map.setZoom(targetZoom);
  }
};

const MapPage = () => {
  const [mapMode, setMapMode] = useState<"domestic" | "overseas">("domestic");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCheckin, setNewCheckin] = useState({ name: "", location: "", emoji: "📍", lat: "", lng: "" });
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", location: "", emoji: "📍" });
  const [clickMode, setClickMode] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Checkin | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [currentTheme, setCurrentTheme] = useState<MapTheme>(mapThemes[0]);
  const [routeMode, setRouteMode] = useState(false);
  const [routePoints, setRoutePoints] = useState<Checkin[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = usePremiumStatus();

  // Naver map refs
  const naverMapRef = useRef<any>(null);
  const naverMapContainerRef = useRef<HTMLDivElement>(null);
  const naverMarkersRef = useRef<any[]>([]);
  const tempMarkerRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);

  // Google map refs
  const googleMapRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  // Route polyline refs
  const naverPolylineRef = useRef<any>(null);
  const googlePolylineRef = useRef<any>(null);

  // Dark mode observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Apply dark mode to Google Map
  useEffect(() => {
    if (googleMapRef.current && window.google?.maps) {
      googleMapRef.current.setOptions({ styles: isDark ? googleDarkStyle : [] });
    }
  }, [isDark]);

  // Apply dark mode to Naver Map
  useEffect(() => {
    if (naverMapRef.current && window.naver?.maps) {
      if (isDark) {
        naverMapRef.current.setMapTypeId(window.naver.maps.MapTypeId?.NORMAL);
        // Naver doesn't support custom styles but we apply a CSS filter
        if (naverMapContainerRef.current) {
          naverMapContainerRef.current.style.filter = "invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.95)";
        }
      } else {
        if (naverMapContainerRef.current) {
          naverMapContainerRef.current.style.filter = "none";
        }
      }
    }
  }, [isDark, mapMode]);

  // Reset form when switching modes
  useEffect(() => {
    setShowAddForm(false);
    setClickMode(false);
    setNewCheckin({ name: "", location: "", emoji: "📍", lat: "", lng: "" });
    setSelectedMarker(null);
    setRouteMode(false);
    setRoutePoints([]);
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
  }, [mapMode]);

  // Route polyline drawing
  useEffect(() => {
    // Clean up existing polylines
    if (naverPolylineRef.current) {
      naverPolylineRef.current.setMap(null);
      naverPolylineRef.current = null;
    }
    if (googlePolylineRef.current) {
      googlePolylineRef.current.setMap(null);
      googlePolylineRef.current = null;
    }

    if (routePoints.length !== 2) return;

    const [p1, p2] = routePoints;

    if (mapMode === "domestic" && naverMapRef.current && window.naver?.maps) {
      const path = [
        new window.naver.maps.LatLng(p1.lat, p1.lng),
        new window.naver.maps.LatLng(p2.lat, p2.lng),
      ];
      naverPolylineRef.current = new window.naver.maps.Polyline({
        map: naverMapRef.current,
        path,
        strokeColor: "hsl(220, 65%, 50%)",
        strokeWeight: 4,
        strokeOpacity: 0.8,
        strokeStyle: "shortdash",
      });
      const bounds = new window.naver.maps.LatLngBounds(
        new window.naver.maps.LatLng(Math.min(p1.lat, p2.lat), Math.min(p1.lng, p2.lng)),
        new window.naver.maps.LatLng(Math.max(p1.lat, p2.lat), Math.max(p1.lng, p2.lng))
      );
      naverMapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }

    if (mapMode === "overseas" && googleMapRef.current && window.google?.maps) {
      googlePolylineRef.current = new window.google.maps.Polyline({
        path: [
          { lat: p1.lat, lng: p1.lng },
          { lat: p2.lat, lng: p2.lng },
        ],
        strokeColor: "hsl(220, 65%, 50%)",
        strokeWeight: 4,
        strokeOpacity: 0.8,
        map: googleMapRef.current,
      });
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: p1.lat, lng: p1.lng });
      bounds.extend({ lat: p2.lat, lng: p2.lng });
      googleMapRef.current.fitBounds(bounds, 60);
    }
  }, [routePoints, mapMode]);

  // Route point selection handler
  const handleRouteSelect = useCallback((pin: Checkin) => {
    if (!routeMode) return;
    setRoutePoints(prev => {
      if (prev.find(p => p.id === pin.id)) {
        return prev.filter(p => p.id !== pin.id);
      }
      if (prev.length >= 2) {
        return [prev[1], pin];
      }
      return [...prev, pin];
    });
  }, [routeMode]);

  const getRouteDistance = () => {
    if (routePoints.length !== 2) return null;
    const [p1, p2] = routePoints;
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const openExternalRoute = () => {
    if (routePoints.length !== 2) return;
    const [p1, p2] = routePoints;
    if (mapMode === "domestic") {
      const url = `https://map.naver.com/v5/directions/${p1.lng},${p1.lat},${encodeURIComponent(p1.name)}/${p2.lng},${p2.lat},${encodeURIComponent(p2.name)}/-/transit`;
      window.open(url, "_blank");
    } else {
      const url = `https://www.google.com/maps/dir/${p1.lat},${p1.lng}/${p2.lat},${p2.lng}`;
      window.open(url, "_blank");
    }
  };

  // ========== NAVER MAP ==========
  useEffect(() => {
    if (mapMode !== "domestic" || !naverMapContainerRef.current) return;

    const initMap = () => {
      if (!window.naver?.maps || !naverMapContainerRef.current) return;

      if (clickListenerRef.current) {
        window.naver.maps.Event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }

      naverMarkersRef.current.forEach(m => m.setMap(null));
      naverMarkersRef.current = [];

      if (tempMarkerRef.current) {
        tempMarkerRef.current.setMap(null);
        tempMarkerRef.current = null;
      }

      naverMapRef.current = new window.naver.maps.Map(naverMapContainerRef.current, {
        center: new window.naver.maps.LatLng(36.5, 127.8),
        zoom: 7,
        zoomControl: true,
        zoomControlOptions: { position: window.naver.maps.Position.RIGHT_BOTTOM },
      });

      // Apply dark filter if dark mode is active
      if (document.documentElement.classList.contains("dark") && naverMapContainerRef.current) {
        naverMapContainerRef.current.style.filter = "invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.95)";
      }
    };

    if (window.__naverMapReady) initMap();
    else window.addEventListener("navermap-ready", initMap);

    return () => {
      window.removeEventListener("navermap-ready", initMap);
    };
  }, [mapMode]);

  // Naver click mode
  useEffect(() => {
    if (mapMode !== "domestic" || !naverMapRef.current || !window.naver) return;
    if (clickListenerRef.current) {
      window.naver.maps.Event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
    if (clickMode && showAddForm) {
      clickListenerRef.current = window.naver.maps.Event.addListener(naverMapRef.current, "click", (e: any) => {
        const lat = e.coord.lat();
        const lng = e.coord.lng();
        if (tempMarkerRef.current) tempMarkerRef.current.setMap(null);
        tempMarkerRef.current = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(lat, lng),
          map: naverMapRef.current,
          icon: {
            content: `<div style="cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
              <svg width="42" height="54" viewBox="0 0 42 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 52C21 52 40 34 40 21C40 10.507 31.493 2 21 2C10.507 2 2 10.507 2 21C2 34 21 52 21 52Z" fill="hsl(0,72%,55%)" stroke="white" stroke-width="2"/>
                <circle cx="21" cy="21" r="11" fill="white"/>
              </svg>
              <div style="position:absolute;top:10px;left:10px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;">📌</div>
            </div>`,
            size: new window.naver.maps.Size(42, 54),
            anchor: new window.naver.maps.Point(21, 52),
          },
        });
        setNewCheckin(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
        if (window.naver.maps.Service) {
          window.naver.maps.Service.reverseGeocode({
            coords: new window.naver.maps.LatLng(lat, lng),
            orders: [window.naver.maps.Service.OrderType.ADDR, window.naver.maps.Service.OrderType.ROAD_ADDR].join(","),
          }, (status: any, response: any) => {
            if (status === window.naver.maps.Service.Status.OK) {
              const result = response.v2.address;
              const address = result.roadAddress || result.jibunAddress || "";
              if (address) setNewCheckin(p => ({ ...p, location: address }));
            }
          });
        }
        toast({ title: "위치가 선택되었습니다 📌" });
      });
    }
    return () => {
      if (clickListenerRef.current) {
        window.naver.maps.Event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [clickMode, showAddForm, toast, mapMode]);

  useEffect(() => {
    if (!showAddForm && tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
      setClickMode(false);
    }
  }, [showAddForm]);

  // Naver geocode search
  const searchLocationNaver = useCallback(() => {
    if (!newCheckin.location.trim() || !window.naver?.maps?.Service) {
      toast({ title: "주소를 입력해주세요", variant: "destructive" });
      return;
    }
    setSearching(true);
    window.naver.maps.Service.geocode({ query: newCheckin.location.trim() }, (status: any, response: any) => {
      setSearching(false);
      if (status !== window.naver.maps.Service.Status.OK || !response.v2.addresses?.length) {
        toast({ title: "위치를 찾을 수 없습니다", description: "더 자세한 주소를 입력해보세요", variant: "destructive" });
        return;
      }
      const item = response.v2.addresses[0];
      const lat = parseFloat(item.y);
      const lng = parseFloat(item.x);
      setNewCheckin(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6), location: item.roadAddress || item.jibunAddress || p.location }));
      if (tempMarkerRef.current) tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(lat, lng),
        map: naverMapRef.current,
        icon: {
          content: `<div style="cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
            <svg width="42" height="54" viewBox="0 0 42 54" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 52C21 52 40 34 40 21C40 10.507 31.493 2 21 2C10.507 2 2 10.507 2 21C2 34 21 52 21 52Z" fill="hsl(0,72%,55%)" stroke="white" stroke-width="2"/>
              <circle cx="21" cy="21" r="11" fill="white"/>
            </svg>
            <div style="position:absolute;top:10px;left:10px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;">📌</div>
          </div>`,
          size: new window.naver.maps.Size(42, 54),
          anchor: new window.naver.maps.Point(21, 52),
        },
      });
      naverMapRef.current?.setCenter(new window.naver.maps.LatLng(lat, lng));
      naverMapRef.current?.setZoom(15);
      toast({ title: "위치를 찾았습니다! 📌" });
    });
  }, [newCheckin.location, toast]);

  // Update naver markers
  const updateNaverMarkers = useCallback(() => {
    if (!naverMapRef.current || !window.naver || !window.naver.maps || !window.naver.maps.Marker) return;
    naverMarkersRef.current.forEach(m => m.setMap(null));
    naverMarkersRef.current = [];
    checkins.forEach(pin => {
      const { main: pinColor, dark: pinColorDark } = getPinColors(pin);
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(pin.lat || 36, pin.lng || 128),
        map: naverMapRef.current,
        icon: {
          content: `<div style="cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
            <svg width="42" height="54" viewBox="0 0 42 54" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 52C21 52 40 34 40 21C40 10.507 31.493 2 21 2C10.507 2 2 10.507 2 21C2 34 21 52 21 52Z" fill="url(#grad_${pin.id})" stroke="white" stroke-width="2"/>
              <circle cx="21" cy="21" r="11" fill="white"/>
              <defs><linearGradient id="grad_${pin.id}" x1="2" y1="2" x2="40" y2="52" gradientUnits="userSpaceOnUse"><stop stop-color="${pinColor}"/><stop offset="1" stop-color="${pinColorDark}"/></linearGradient></defs>
            </svg>
            <div style="position:absolute;top:10px;left:10px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;">${pin.emoji}</div>
          </div>`,
          size: new window.naver.maps.Size(42, 54),
          anchor: new window.naver.maps.Point(21, 52),
        },
      });
      const infoWindow = new window.naver.maps.InfoWindow({
        content: `<div style="padding:12px 14px;font-family:'Plus Jakarta Sans',sans-serif;min-width:150px;border-radius:12px;"><p style="font-weight:600;margin:0 0 4px;font-size:13px;">${pin.emoji} ${pin.name}</p><p style="font-size:11px;color:#888;margin:0;">${pin.location}</p><p style="font-size:10px;color:#aaa;margin:4px 0 0;">${new Date(pin.created_at).toLocaleDateString("ko-KR")}</p></div>`,
        borderWidth: 0, backgroundColor: "white", borderColor: "transparent",
        anchorSize: new window.naver.maps.Size(8, 8),
      });
      window.naver.maps.Event.addListener(marker, "click", () => {
        if (infoWindow.getMap()) infoWindow.close();
        else infoWindow.open(naverMapRef.current, marker);
        smoothZoomTo(naverMapRef.current, 16, pin.lat, pin.lng, true);
      });
      naverMarkersRef.current.push(marker);
    });
    if (checkins.length > 0) {
      const bounds = new window.naver.maps.LatLngBounds(
        new window.naver.maps.LatLng(Math.min(...checkins.map(c => c.lat || 36)), Math.min(...checkins.map(c => c.lng || 128))),
        new window.naver.maps.LatLng(Math.max(...checkins.map(c => c.lat || 36)), Math.max(...checkins.map(c => c.lng || 128)))
      );
      naverMapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      if (checkins.length === 1) naverMapRef.current.setZoom(14);
    }
  }, [checkins]);

  useEffect(() => {
    if (mapMode === "domestic") updateNaverMarkers();
  }, [updateNaverMarkers, mapMode]);

  // ========== GOOGLE MAP ==========
  const onGoogleMapLoad = useCallback((map: any) => {
    googleMapRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();
  }, []);

  const handleGoogleMapClick = useCallback((e: any) => {
    if (!clickMode || !showAddForm || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setNewCheckin(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          setNewCheckin(p => ({ ...p, location: results![0].formatted_address }));
        }
      });
    }
    toast({ title: "위치가 선택되었습니다 📌" });
  }, [clickMode, showAddForm, toast]);

  const searchLocationGoogle = useCallback(() => {
    if (!newCheckin.location.trim()) {
      toast({ title: "주소를 입력해주세요", variant: "destructive" });
      return;
    }
    if (!geocoderRef.current) {
      toast({ title: "지도가 아직 로드되지 않았습니다", variant: "destructive" });
      return;
    }
    setSearching(true);
    geocoderRef.current.geocode({ address: newCheckin.location.trim() }, (results, status) => {
      setSearching(false);
      if (status !== "OK" || !results?.[0]) {
        toast({ title: "위치를 찾을 수 없습니다", description: "더 자세한 주소를 입력해보세요", variant: "destructive" });
        return;
      }
      const loc = results[0].geometry.location;
      const lat = loc.lat();
      const lng = loc.lng();
      setNewCheckin(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6), location: results![0].formatted_address }));
      googleMapRef.current?.panTo({ lat, lng });
      googleMapRef.current?.setZoom(15);
      toast({ title: "위치를 찾았습니다! 📌" });
    });
  }, [newCheckin.location, toast]);

  // Google fit bounds
  useEffect(() => {
    if (mapMode !== "overseas" || !googleMapRef.current || checkins.length === 0 || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    checkins.forEach(c => bounds.extend({ lat: c.lat || 0, lng: c.lng || 0 }));
    googleMapRef.current.fitBounds(bounds, 40);
    if (checkins.length === 1) setTimeout(() => googleMapRef.current?.setZoom(14), 300);
  }, [checkins, mapMode]);

  // ========== SHARED LOGIC ==========
  const searchLocation = mapMode === "domestic" ? searchLocationNaver : searchLocationGoogle;

  // Fetch filters
  useEffect(() => {
    const fetchFilters = async () => {
      if (!user) return;
      const options: FilterOption[] = [
        { id: "all", label: "전체", type: "all" },
        { id: "mine", label: "내 기록", type: "mine" },
      ];
      const { data: couple } = await supabase
        .from("couples").select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq("status", "connected").maybeSingle();
      if (couple) options.push({ id: `couple_${couple.id}`, label: "연인", type: "couple" });
      const { data: memberships } = await supabase
        .from("group_members").select("group_id").eq("user_id", user.id);
      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id);
        const { data: groups } = await supabase.from("groups").select("id, name").in("id", groupIds);
        groups?.forEach(g => options.push({ id: `group_${g.id}`, label: g.name, type: "group" }));
      }
      setFilterOptions(options);
    };
    fetchFilters();
  }, [user]);

  const fetchCheckins = async () => {
    if (!user) return;
    setLoading(true);
    if (activeFilter.startsWith("group_")) {
      const groupId = activeFilter.replace("group_", "");
      const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
      const memberIds = members?.map(m => m.user_id) || [];
      if (memberIds.length === 0) { setCheckins([]); setLoading(false); return; }
      const { data } = await supabase.from("checkins").select("*")
        .or(`group_id.eq.${groupId},user_id.in.(${memberIds.join(",")})`)
        .eq("map_type", mapMode === "overseas" ? "overseas" : "domestic")
        .order("created_at", { ascending: false });
      setCheckins(data || []);
    } else {
      let query = supabase.from("checkins").select("*").eq("map_type", mapMode === "overseas" ? "overseas" : "domestic").order("created_at", { ascending: false });
      if (activeFilter === "mine") query = query.eq("user_id", user.id);
      else if (activeFilter.startsWith("couple_")) query = query.eq("couple_id", activeFilter.replace("couple_", ""));
      const { data } = await query;
      setCheckins(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCheckins(); }, [user, activeFilter, mapMode]);

  const handleAddCheckin = async () => {
    if (!user || !newCheckin.name.trim()) return;
    setSaving(true);
    if (!newCheckin.lat || !newCheckin.lng) {
      toast({ title: "위치를 먼저 설정해주세요", description: "주소를 검색하거나 지도에서 클릭하세요", variant: "destructive" });
      setSaving(false);
      return;
    }
    const insertData: any = {
      user_id: user.id, name: newCheckin.name.trim(), location: newCheckin.location.trim(),
      emoji: newCheckin.emoji || "📍", lat: parseFloat(newCheckin.lat), lng: parseFloat(newCheckin.lng),
      map_type: mapMode === "overseas" ? "overseas" : "domestic",
    };
    if (activeFilter.startsWith("couple_")) insertData.couple_id = activeFilter.replace("couple_", "");
    else if (activeFilter.startsWith("group_")) insertData.group_id = activeFilter.replace("group_", "");

    const { error } = await supabase.from("checkins").insert(insertData);
    if (error) toast({ title: "오류", description: error.message, variant: "destructive" });
    else {
      toast({ title: "체크인 완료! 📍" });
      setNewCheckin({ name: "", location: "", emoji: "📍", lat: "", lng: "" });
      setShowAddForm(false);
      if (tempMarkerRef.current) { tempMarkerRef.current.setMap(null); tempMarkerRef.current = null; }
      fetchCheckins();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("checkins").delete().eq("id", id);
    if (error) toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    else { setCheckins(prev => prev.filter(c => c.id !== id)); toast({ title: "삭제되었습니다" }); }
  };

  const startEdit = (pin: Checkin) => {
    setEditingId(pin.id);
    setEditData({ name: pin.name, location: pin.location, emoji: pin.emoji });
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase.from("checkins").update({
      name: editData.name.trim(), location: editData.location.trim(), emoji: editData.emoji,
    }).eq("id", id);
    if (error) toast({ title: "수정 실패", description: error.message, variant: "destructive" });
    else { setEditingId(null); fetchCheckins(); toast({ title: "수정되었습니다" }); }
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-4xl mx-auto">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-foreground font-display tracking-tight mb-4">지도 🗺️</h1>

        {/* Domestic / Overseas toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMapMode("domestic")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              mapMode === "domestic"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            <MapPin className="w-4 h-4" /> 국내
          </button>
          <button
            onClick={() => setMapMode("overseas")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              mapMode === "overseas"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            <Globe className="w-4 h-4" /> 해외
          </button>
        </div>

        {/* Filter options */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
          {filterOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                activeFilter === opt.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {opt.type === "couple" && <Heart className="w-3 h-3" />}
              {opt.type === "group" && <Users className="w-3 h-3" />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Theme Selector (overseas only) */}
        {mapMode === "overseas" && (
          <div className="mb-4">
            <ThemeSelector
              isPremium={isPremium}
              currentThemeId={currentTheme.id}
              onSelectTheme={setCurrentTheme}
            />
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="mx-5 mb-6 rounded-2xl overflow-hidden border border-border h-[280px] md:h-[450px] relative">
        {mapMode === "domestic" ? (
          <div ref={naverMapContainerRef} style={{ width: "100%", height: "100%" }} />
        ) : (
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={googleMapContainerStyle}
              center={googleDefaultCenter}
              zoom={3}
              onLoad={onGoogleMapLoad}
              onClick={handleGoogleMapClick}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                gestureHandling: "greedy",
                styles: currentTheme.id !== "default" ? currentTheme.styles : (isDark ? googleDarkStyle : []),
              }}
            >
              {window.google?.maps && checkins.map(pin => {
                const { main, dark } = getPinColors(pin);
                return (
                  <Marker
                    key={pin.id}
                    position={{ lat: pin.lat || 0, lng: pin.lng || 0 }}
                    icon={{
                      url: createPinSvgUrl(pin.emoji, main, dark, pin.id),
                      scaledSize: new window.google.maps.Size(42, 54),
                      anchor: new window.google.maps.Point(21, 54),
                    }}
                    onClick={() => {
                      setSelectedMarker(pin);
                      if (googleMapRef.current) {
                        smoothZoomTo(googleMapRef.current, 16, pin.lat, pin.lng, false);
                      }
                    }}
                  />
                );
              })}
              {window.google?.maps && newCheckin.lat && newCheckin.lng && (
                <Marker
                  position={{ lat: parseFloat(newCheckin.lat), lng: parseFloat(newCheckin.lng) }}
                  icon={{
                    url: createPinSvgUrl("📌", "hsl(0, 70%, 55%)", "hsl(0, 70%, 40%)", "temp"),
                    scaledSize: new window.google.maps.Size(42, 54),
                    anchor: new window.google.maps.Point(21, 54),
                  }}
                />
              )}
              {selectedMarker && (
                <InfoWindow
                  position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div style={{ fontFamily: "sans-serif", minWidth: 140 }}>
                    <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{selectedMarker.emoji} {selectedMarker.name}</p>
                    <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{selectedMarker.location}</p>
                    <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>
                      {new Date(selectedMarker.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {clickMode && showAddForm && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full z-[1000] shadow-lg animate-pulse">
            지도를 클릭하여 위치를 선택하세요
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-sm text-muted-foreground bg-card/90 backdrop-blur px-3 py-1.5 rounded-lg z-[1000]">
          <Navigation className="w-4 h-4 text-primary" />
          총 {checkins.length}개
        </div>
        {routeMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full z-[1000] shadow-lg animate-pulse">
            경로를 볼 장소 2개를 선택하세요 ({routePoints.length}/2)
          </div>
        )}
      </div>

      {/* Route info panel */}
      <AnimatePresence>
        {routeMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-5 mb-4 overflow-hidden">
            <div className="p-4 rounded-2xl bg-card border border-primary/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-primary" /> 경로 보기
                </h3>
                <button onClick={() => { setRouteMode(false); setRoutePoints([]); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${routePoints[0] ? "border-primary/40 bg-primary/5" : "border-dashed border-border"}`}>
                  <span className="text-xs font-medium text-primary w-4">A</span>
                  <span className="text-sm text-foreground truncate">{routePoints[0] ? `${routePoints[0].emoji} ${routePoints[0].name}` : "출발지를 선택하세요"}</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${routePoints[1] ? "border-primary/40 bg-primary/5" : "border-dashed border-border"}`}>
                  <span className="text-xs font-medium text-primary w-4">B</span>
                  <span className="text-sm text-foreground truncate">{routePoints[1] ? `${routePoints[1].emoji} ${routePoints[1].name}` : "도착지를 선택하세요"}</span>
                </div>
              </div>
              {routePoints.length === 2 && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">직선 거리: 약 {getRouteDistance()}km</p>
                  <Button size="sm" variant="outline" className="rounded-full gap-1.5 text-xs" onClick={openExternalRoute}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    {mapMode === "domestic" ? "네이버 지도" : "Google Maps"}에서 보기
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-5 mb-4 overflow-hidden">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">새 체크인 {mapMode === "overseas" ? "(해외)" : "(국내)"}</h3>
                <button onClick={() => setShowAddForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <Input value={newCheckin.name} onChange={e => setNewCheckin(p => ({ ...p, name: e.target.value }))} placeholder="장소 이름" className="rounded-xl bg-background" />
              <div className="flex gap-2">
                <Input
                  value={newCheckin.location}
                  onChange={e => setNewCheckin(p => ({ ...p, location: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") searchLocation(); }}
                  placeholder={mapMode === "overseas" ? "주소 또는 위치 검색 (영어/현지어)" : "주소 또는 위치 검색"}
                  className="rounded-xl bg-background flex-1"
                />
                <Button size="sm" variant="outline" onClick={searchLocation} disabled={searching} className="rounded-xl shrink-0">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {newCheckin.lat && newCheckin.lng && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  ✅ 위치 설정됨 ({parseFloat(newCheckin.lat).toFixed(4)}, {parseFloat(newCheckin.lng).toFixed(4)})
                </p>
              )}
              <Button
                size="sm"
                variant={clickMode ? "default" : "outline"}
                onClick={() => setClickMode(p => !p)}
                className="w-full rounded-xl gap-1.5 text-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                {clickMode ? "지도 클릭 모드 ON" : "지도에서 직접 선택하기"}
              </Button>
              <div className="flex gap-2">
                {emojiOptions.map(e => (
                  <button key={e} onClick={() => setNewCheckin(p => ({ ...p, emoji: e }))} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${newCheckin.emoji === e ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}>{e}</button>
                ))}
              </div>
              {activeFilter.startsWith("group_") && <p className="text-xs text-accent">✓ 현재 선택된 그룹에 체크인됩니다</p>}
              {activeFilter.startsWith("couple_") && <p className="text-xs text-terracotta">✓ 연인 체크인으로 저장됩니다</p>}
              <Button onClick={handleAddCheckin} disabled={saving || !newCheckin.name.trim()} className="w-full rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "체크인하기"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkin list */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">체크인 기록</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={routeMode ? "default" : "outline"}
              className="rounded-full gap-1"
              onClick={() => {
                if (!isPremium) {
                  toast({ title: "프리미엄 기능입니다", description: "경로 보기는 프리미엄 사용자만 이용할 수 있습니다" });
                  return;
                }
                setRouteMode(p => !p);
                if (routeMode) setRoutePoints([]);
              }}
              disabled={checkins.length < 2}
            >
              <Route className="w-4 h-4" /> 경로
            </Button>
            <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" /> 추가
            </Button>
          </div>
        </div>

        {checkins.length === 0 && !loading ? (
          <div className="text-center py-8 bg-card rounded-2xl border border-border">
            {mapMode === "overseas" ? <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" /> : <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />}
            <p className="text-sm text-muted-foreground">체크인 기록이 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkins.map((pin, i) => (
              <motion.div key={pin.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                {editingId === pin.id ? (
                  <div className="p-3 rounded-xl bg-card border border-primary/40 space-y-2">
                    <Input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} className="rounded-lg text-sm" />
                    <Input value={editData.location} onChange={e => setEditData(p => ({ ...p, location: e.target.value }))} className="rounded-lg text-sm" />
                    <div className="flex gap-1.5">
                      {emojiOptions.map(e => (
                        <button key={e} onClick={() => setEditData(p => ({ ...p, emoji: e }))} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${editData.emoji === e ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}>{e}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(pin.id)} className="flex-1 rounded-lg gap-1"><Check className="w-3.5 h-3.5" /> 저장</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-lg">취소</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl bg-card border cursor-pointer transition-colors ${
                      routeMode && routePoints.find(p => p.id === pin.id)
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => {
                      if (routeMode) {
                        handleRouteSelect(pin);
                        return;
                      }
                      if (pin.lat && pin.lng) {
                        if (mapMode === "domestic" && naverMapRef.current) {
                          smoothZoomTo(naverMapRef.current, 16, pin.lat, pin.lng, true);
                        } else if (mapMode === "overseas" && googleMapRef.current) {
                          smoothZoomTo(googleMapRef.current, 16, pin.lat, pin.lng, false);
                          setSelectedMarker(pin);
                        }
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg relative">
                      {pin.emoji}
                      {routeMode && routePoints.find(p => p.id === pin.id) && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {routePoints.findIndex(p => p.id === pin.id) === 0 ? "A" : "B"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pin.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{pin.location} · {new Date(pin.created_at).toLocaleDateString("ko-KR")}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {mapMode === "domestic" && pin.lat && pin.lng && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `https://map.naver.com/v5/directions/-/${pin.lng},${pin.lat},${encodeURIComponent(pin.name)}/-/transit?c=${pin.lng},${pin.lat},15,0,0,0,dh`;
                            window.open(url, "_blank");
                          }}
                          className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                          title="네이버 지도 길찾기"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-primary" />
                        </button>
                      )}
                      {pin.user_id === user?.id && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); startEdit(pin); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(pin.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                    {pin.couple_id ? <Heart className="w-4 h-4 text-terracotta shrink-0" /> : pin.group_id ? <Users className="w-4 h-4 text-accent shrink-0" /> : null}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
