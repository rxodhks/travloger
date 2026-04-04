
CREATE TABLE public.trip_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  places text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT '완료',
  original_trip_id uuid,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip history"
  ON public.trip_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trip history"
  ON public.trip_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trip history"
  ON public.trip_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Also allow viewing trip history of group members (for shared trips)
-- We keep it simple: users see their own + can see others' via the page
