import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isRestTableMissingError } from "@/lib/supabaseSchemaHealth";

export type SchemaHealthStatus = "idle" | "checking" | "ready" | "missing";

type SchemaHealthValue = {
  status: SchemaHealthStatus;
};

const SchemaHealthContext = createContext<SchemaHealthValue>({
  status: "idle",
});

type Probe = "pending" | "ok" | "bad" | null;

export function SchemaHealthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [probe, setProbe] = useState<Probe>(null);

  useEffect(() => {
    if (!user) {
      setProbe(null);
      return;
    }
    setProbe("pending");
    let cancelled = false;
    supabase
      .from("profiles")
      .select("user_id")
      .limit(1)
      .then(({ error }) => {
        if (cancelled) return;
        if (error && isRestTableMissingError(error)) {
          setProbe("bad");
          return;
        }
        setProbe("ok");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const status: SchemaHealthStatus = useMemo(() => {
    if (!user) return "idle";
    if (probe === null || probe === "pending") return "checking";
    if (probe === "bad") return "missing";
    return "ready";
  }, [user, probe]);

  const value = useMemo(() => ({ status }), [status]);

  return (
    <SchemaHealthContext.Provider value={value}>
      {children}
    </SchemaHealthContext.Provider>
  );
}

export function useSchemaHealth() {
  return useContext(SchemaHealthContext);
}
