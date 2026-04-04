
-- Checkins table with group association
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '📍',
  lat double precision DEFAULT 0,
  lng double precision DEFAULT 0,
  couple_id uuid REFERENCES public.couples(id) ON DELETE SET NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Users can create their own checkins
CREATE POLICY "Users can create checkins" ON public.checkins
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view checkins from their couple or groups
CREATE POLICY "Users can view relevant checkins" ON public.checkins
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (couple_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = checkins.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    ))
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = checkins.group_id AND gm.user_id = auth.uid()
    ))
  );

-- Users can delete their own checkins
CREATE POLICY "Users can delete own checkins" ON public.checkins
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
