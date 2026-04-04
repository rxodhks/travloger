import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find trip plans where end_date + 1 day <= today
    const today = new Date().toISOString().split("T")[0];

    const { data: expiredTrips, error: fetchError } = await supabase
      .from("trip_plans")
      .select("*")
      .not("end_date", "is", null)
      .lte("end_date", new Date(Date.now() - 86400000).toISOString().split("T")[0]);

    if (fetchError) throw fetchError;

    if (!expiredTrips || expiredTrips.length === 0) {
      return new Response(JSON.stringify({ archived: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Archive each trip
    const historyRows = expiredTrips.map((trip: any) => ({
      user_id: trip.user_id,
      title: trip.title,
      start_date: trip.start_date,
      end_date: trip.end_date,
      places: trip.places || [],
      status: trip.status,
      original_trip_id: trip.id,
      group_id: trip.group_id || null,
      couple_id: trip.couple_id || null,
      created_at: trip.created_at,
    }));

    const { error: insertError } = await supabase
      .from("trip_history")
      .insert(historyRows);

    if (insertError) throw insertError;

    // Delete archived trips
    const ids = expiredTrips.map((t: any) => t.id);
    const { error: deleteError } = await supabase
      .from("trip_plans")
      .delete()
      .in("id", ids);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ archived: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
