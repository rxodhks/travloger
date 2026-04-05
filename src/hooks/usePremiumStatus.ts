import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabaseEdgeInvoke";
import { useAuth } from "@/contexts/AuthContext";
import { useSchemaHealth } from "@/contexts/SchemaHealthContext";

// Simple in-memory cache to avoid repeated edge function calls
let cachedResult: { isPremium: boolean; plan: string | null; subscriptionEnd: string | null; timestamp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export const usePremiumStatus = () => {
  const { user } = useAuth();
  const { status: schemaStatus } = useSchemaHealth();
  const [isPremium, setIsPremium] = useState(cachedResult?.isPremium ?? false);
  const [plan, setPlan] = useState<string | null>(cachedResult?.plan ?? null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(cachedResult?.subscriptionEnd ?? null);
  const [loading, setLoading] = useState(!cachedResult);
  const checkedRef = useRef(false);

  const applyResult = useCallback((premium: boolean, p: string | null, end: string | null) => {
    setIsPremium(premium);
    setPlan(p);
    setSubscriptionEnd(end);
    cachedResult = { isPremium: premium, plan: p, subscriptionEnd: end, timestamp: Date.now() };
  }, []);

  const checkStatus = useCallback(async (force = false) => {
    if (!user) {
      setIsPremium(false);
      setPlan(null);
      setLoading(false);
      return;
    }

    // Use cache if fresh
    if (!force && cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      setIsPremium(cachedResult.isPremium);
      setPlan(cachedResult.plan);
      setSubscriptionEnd(cachedResult.subscriptionEnd);
      setLoading(false);
      return;
    }

    const skipEdgeFn = schemaStatus === "missing";

    try {
      if (!skipEdgeFn) {
        const { data: stripeData, error: stripeError } = await invokeEdgeFunction<{
          subscribed?: boolean;
          plan?: string;
          subscription_end?: string | null;
        }>("check-subscription");

        if (!stripeError && stripeData?.subscribed) {
          applyResult(true, stripeData.plan || "premium", stripeData.subscription_end || null);
          setLoading(false);
          return;
        }
      }

      // Fallback: check local subscriptions table (for Toss payments)
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status, expires_at, plan")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        applyResult(true, data.plan, data.expires_at);
      } else {
        applyResult(false, null, null);
      }
    } catch {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status, expires_at, plan")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        applyResult(true, data.plan, data.expires_at);
      } else {
        applyResult(false, null, null);
      }
    }

    setLoading(false);
  }, [user, applyResult, schemaStatus]);

  useEffect(() => {
    if (!user) {
      checkedRef.current = false;
      return;
    }
    if (schemaStatus === "checking" || schemaStatus === "idle") {
      return;
    }
    if (!checkedRef.current) {
      checkedRef.current = true;
      checkStatus();
    }
  }, [user, schemaStatus, checkStatus]);

  const limits = {
    maxGroupMembers: isPremium ? 50 : 5,
    maxMonthlyPhotos: isPremium ? Infinity : 50,
    maxPhotoResolution: isPremium ? "original" as const : "compressed" as const,
  };

  const refresh = useCallback(() => checkStatus(true), [checkStatus]);

  return { isPremium, plan, subscriptionEnd, loading, limits, refresh };
};
