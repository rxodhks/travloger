import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Trash2, Loader2, History, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface TripHistory {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  places: string[];
  user_id: string;
  archived_at: string;
  created_at: string;
}

const TripHistoryPage = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trip-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_history")
        .select("*")
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return data as TripHistory[];
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("trip_history").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["trip-history"] });
      toast({ title: "여행 기록이 삭제되었습니다" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto">
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            여행 기록 📋
          </motion.h1>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          종료된 여행 계획이 자동으로 보관됩니다.
        </p>
      </div>

      <div className="px-5 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">아직 여행 기록이 없어요</p>
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
                      {(trip.start_date || trip.end_date) && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {trip.start_date} {trip.end_date && `~ ${trip.end_date}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
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

export default TripHistoryPage;
