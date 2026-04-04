import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Plus, Heart, Users, Loader2, X, Trash2, Pencil, Check, Search, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";

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
}

interface FilterOption {
  id: string;
  label: string;
  type: "all" | "couple" | "group" | "mine";
}

const emojiOptions = ["📍", "☕", "🍽️", "🏖️", "🎬", "🛍️", "🏯", "🧺"];

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 35.0, lng: 100.0 };

const GlobalMapPage = () => {
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
  const { user } = useAuth();
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!clickMode || !showAddForm || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setNewCheckin(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }));

    // Reverse geocode
    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          setNewCheckin(p => ({ ...p, location: results![0].formatted_address }));
        }
      });
    }
    toast({ title: "위치가 선택되었습니다 📌" });
  }, [clickMode, showAddForm, toast]);

  const searchLocation = useCallback(() => {
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
      setNewCheckin(p => ({
        ...p,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        location: results![0].formatted_address,
      }));
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(15);
      toast({ title: "위치를 찾았습니다! 📌" });
    });
  }, [newCheckin.location, toast]);

  // Fit bounds when checkins change
  useEffect(() => {
    if (!mapRef.current || checkins.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    checkins.forEach(c => bounds.extend({ lat: c.lat || 0, lng: c.lng || 0 }));
    mapRef.current.fitBounds(bounds, 40);
    if (checkins.length === 1) {
      setTimeout(() => mapRef.current?.setZoom(14), 300);
    }
  }, [checkins]);

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
      if (memberships?.length) {
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
      const { data: members } = await supabase
        .from("group_members").select("user_id").eq("group_id", groupId);
      const memberIds = members?.map(m => m.user_id) || [];
      if (!memberIds.length) { setCheckins([]); setLoading(false); return; }
      const { data } = await supabase
        .from("checkins").select("*")
        .or(`group_id.eq.${groupId},user_id.in.(${memberIds.join(",")})`)
        .order("created_at", { ascending: false });
      setCheckins(data || []);
    } else {
      let query = supabase.from("checkins").select("*").order("created_at", { ascending: false });
      if (activeFilter === "mine") query = query.eq("user_id", user.id);
      else if (activeFilter.startsWith("couple_")) query = query.eq("couple_id", activeFilter.replace("couple_", ""));
      const { data } = await query;
      setCheckins(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCheckins(); }, [user, activeFilter]);

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
    };
    if (activeFilter.startsWith("couple_")) insertData.couple_id = activeFilter.replace("couple_", "");
    else if (activeFilter.startsWith("group_")) insertData.group_id = activeFilter.replace("group_", "");

    const { error } = await supabase.from("checkins").insert(insertData);
    if (error) toast({ title: "오류", description: error.message, variant: "destructive" });
    else {
      toast({ title: "체크인 완료! 📍" });
      setNewCheckin({ name: "", location: "", emoji: "📍", lat: "", lng: "" });
      setShowAddForm(false);
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
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-display tracking-tight">해외 지도 🌍</h1>
        </div>
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
      </div>

      {/* Google Map */}
      <div className="mx-5 mb-6 rounded-2xl overflow-hidden border border-border h-[280px] md:h-[450px] relative">
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={3}
            onLoad={onMapLoad}
            onClick={handleMapClick}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              gestureHandling: "greedy",
            }}
          >
            {checkins.map(pin => (
              <Marker
                key={pin.id}
                position={{ lat: pin.lat || 0, lng: pin.lng || 0 }}
                label={{ text: pin.emoji, fontSize: "18px" }}
                onClick={() => setSelectedMarker(pin)}
              />
            ))}
            {newCheckin.lat && newCheckin.lng && (
              <Marker
                position={{ lat: parseFloat(newCheckin.lat), lng: parseFloat(newCheckin.lng) }}
                label={{ text: "📌", fontSize: "20px" }}
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
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-5 mb-4 overflow-hidden">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">새 체크인 (해외)</h3>
                <button onClick={() => setShowAddForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <Input value={newCheckin.name} onChange={e => setNewCheckin(p => ({ ...p, name: e.target.value }))} placeholder="장소 이름" className="rounded-xl bg-background" />
              <div className="flex gap-2">
                <Input
                  value={newCheckin.location}
                  onChange={e => setNewCheckin(p => ({ ...p, location: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") searchLocation(); }}
                  placeholder="주소 또는 위치 검색 (영어/현지어)"
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
          <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4" /> 추가
          </Button>
        </div>

        {checkins.length === 0 && !loading ? (
          <div className="text-center py-8 bg-card rounded-2xl border border-border">
            <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">해외 체크인 기록이 없어요</p>
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
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">{pin.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pin.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{pin.location} · {new Date(pin.created_at).toLocaleDateString("ko-KR")}</p>
                    </div>
                    {pin.user_id === user?.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(pin)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(pin.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    )}
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

export default GlobalMapPage;
