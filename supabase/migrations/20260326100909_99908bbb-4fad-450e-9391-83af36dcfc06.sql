
ALTER TABLE public.trip_history ADD COLUMN group_id uuid;
ALTER TABLE public.trip_history ADD COLUMN couple_id uuid;

DROP POLICY "Users can view own trip history" ON public.trip_history;

CREATE POLICY "Users can view relevant trip history"
  ON public.trip_history FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
    OR (couple_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM couples c WHERE c.id = trip_history.couple_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    ))
  );
