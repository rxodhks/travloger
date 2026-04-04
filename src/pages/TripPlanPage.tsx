import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Calendar, Trash2, Loader2, Plane, X, Users, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import AiTravelRecommend from "@/components/premium/AiTravelRecommend";
import SmartRouteOptimizer from "@/components/premium/SmartRouteOptimizer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListPageSkeleton } from "@/components/ui/page-skeleton";

interface TripPlan {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  places: string[];
  user_id: string;
  group_id: string | null;
  couple_id: string | null;
  created_at: string;
  author_name?: string;
}

interface GroupOption {
  id: string;
  name: string;
  type: string;
}

const TripPlanPage = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [placeInput, setPlaceInput] = useState("");
  const [places, setPlaces] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = usePremiumStatus();
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: ["my-groups", user?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);
      if (!memberships || memberships.length === 0) return [];
      const groupIds = memberships.map(m => m.group_id);
      const { data } = await supabase
        .from("groups")
        .select("id, name, type")
        .in("id", groupIds);
      return (data || []) as GroupOption[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: trips = [], isLoading: loading } = useQuery({
    queryKey: ["trip-plans", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_plans")
        .select("*")
        .order("created_at", { ascending: false });
      if (!data) return [];
      const userIds = [...new Set(data.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      return data.map((t: any) => ({
        ...t,
        author_name: nameMap.get(t.user_id) || "멤버",
      })) as TripPlan[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const insertData: any = {
      user_id: user.id,
      title: title.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      places,
    };
    if (selectedGroupId) insertData.group_id = selectedGroupId;
    const { error } = await supabase.from("trip_plans").insert(insertData);
    if (error) {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "여행 계획 추가됨 ✈️" });
      setTitle(""); setStartDate(""); setEndDate(""); setPlaces([]); setSelectedGroupId(""); setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["trip-plans"] });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const tripToArchive = trips.find(t => t.id === id);
    if (tripToArchive) {
      await supabase.from("trip_history").insert({
        user_id: tripToArchive.user_id,
        title: tripToArchive.title,
        start_date: tripToArchive.start_date,
        end_date: tripToArchive.end_date,
        places: tripToArchive.places,
        status: tripToArchive.status,
        original_trip_id: tripToArchive.id,
        group_id: tripToArchive.group_id || null,
        couple_id: tripToArchive.couple_id || null,
        created_at: tripToArchive.created_at,
      });
    }
    const { error } = await supabase.from("trip_plans").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["trip-plans"] });
      toast({ title: "여행 계획이 기록으로 보관되었습니다 📋" });
    }
  };

  const addPlace = () => {
    if (placeInput.trim()) {
      setPlaces(prev => [...prev, placeInput.trim()]);
      setPlaceInput("");
    }
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return null;
    return groups.find(g => g.id === groupId)?.name;
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            여행 플래너 ✈️
          </motion.h1>
          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "취소" : "새 여행"}
          </Button>
        </div>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-5 mb-4"
        >
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="여행 제목 (예: 제주도 여행 🌊)"
                className="rounded-xl"
              />
              {groups.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">그룹 (선택사항)</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGroupId("")}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        !selectedGroupId ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      개인
                    </button>
                    {groups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                          selectedGroupId === g.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">시작일</p>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl" />
                </div>
                <span className="text-muted-foreground text-sm mt-4">~</span>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">종료일</p>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={placeInput}
                  onChange={e => setPlaceInput(e.target.value)}
                  placeholder="장소 추가"
                  className="rounded-xl flex-1"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPlace())}
                />
                <Button variant="outline" size="sm" onClick={addPlace} className="rounded-xl">추가</Button>
              </div>
              {places.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {places.map((p, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground flex items-center gap-1">
                      {p}
                      <button onClick={() => setPlaces(prev => prev.filter((_, j) => j !== i))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Button onClick={handleCreate} disabled={saving || !title.trim()} className="w-full rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "여행 계획 만들기"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="px-5">
        <AiTravelRecommend isPremium={isPremium} />
      </div>

      <div className="px-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <Plane className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">아직 여행 계획이 없어요</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-primary mt-2 font-medium">
              첫 여행 계획 만들기 →
            </button>
          </div>
        ) : (
          trips.map((trip, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="border-border/60 shadow-sm cursor-pointer overflow-hidden"
                onClick={() => setExpandedId(expandedId === trip.id ? null : trip.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground truncate">{trip.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {(trip.start_date || trip.end_date) && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {trip.start_date} {trip.end_date && `~ ${trip.end_date}`}
                          </span>
                        )}
                        {trip.group_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {getGroupName(trip.group_id) || "그룹"}
                          </span>
                        )}
                        {trip.user_id !== user?.id && (
                          <span className="text-xs text-muted-foreground">
                            by {trip.author_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        trip.status === "완료" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"
                      }`}>
                        {trip.status}
                      </span>
                      {trip.user_id === user?.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedId === trip.id && trip.places.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 border-t border-border/60 pt-4"
                    >
                      <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-primary" /> 방문 장소
                      </p>
                      <div className="space-y-2">
                        {trip.places.map((place, pi) => (
                          <div key={pi} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                              {pi + 1}
                            </div>
                            <span className="text-sm text-foreground">{place}</span>
                          </div>
                        ))}
                      </div>

                      {/* 네이버 지도 길찾기 */}
                      {trip.places.length >= 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl gap-2 mt-3 border-primary/30 text-primary hover:bg-primary/5"
                          onClick={(e) => {
                            e.stopPropagation();
                            const places = trip.places;
                            const query = places.map(p => encodeURIComponent(p)).join("/");
                            const url = `https://map.naver.com/v5/search/${encodeURIComponent(places[0])}`;
                            // Naver Maps multi-stop directions URL
                            const directionsUrl = `https://map.naver.com/v5/directions/-/${encodeURIComponent(places[places.length - 1])}/-/transit`;
                            window.open(directionsUrl, "_blank");
                          }}
                        >
                          <Navigation className="w-4 h-4" />
                          네이버 지도에서 길찾기
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </Button>
                      )}

                      {trip.user_id === user?.id && (
                        <SmartRouteOptimizer
                          isPremium={isPremium}
                          places={trip.places}
                          tripId={trip.id}
                          onApply={async (optimized) => {
                            await supabase.from("trip_plans").update({ places: optimized }).eq("id", trip.id);
                            queryClient.invalidateQueries({ queryKey: ["trip-plans"] });
                            toast({ title: "동선이 최적화되었습니다! 🗺️" });
                          }}
                        />
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default TripPlanPage;
