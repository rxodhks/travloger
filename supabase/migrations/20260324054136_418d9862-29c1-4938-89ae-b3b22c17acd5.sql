
-- Create trip_plans table
CREATE TABLE public.trip_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '계획중',
  start_date date,
  end_date date,
  places text[] NOT NULL DEFAULT '{}',
  couple_id uuid REFERENCES public.couples(id) ON DELETE SET NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create trip plans"
ON public.trip_plans FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view relevant trip plans"
ON public.trip_plans FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (couple_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM couples c WHERE c.id = trip_plans.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ))
  OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), trip_plans.group_id))
);

CREATE POLICY "Users can delete own trip plans"
ON public.trip_plans FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own trip plans"
ON public.trip_plans FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Add DELETE policy for couples (owner can delete)
CREATE POLICY "Users can delete their own couple"
ON public.couples FOR DELETE TO authenticated
USING (auth.uid() = user1_id);

-- Add DELETE policy for groups (owner can delete)
CREATE POLICY "Owner can delete groups"
ON public.groups FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- Add DELETE policy for group_members (members can leave)
CREATE POLICY "Members can leave groups"
ON public.group_members FOR DELETE TO authenticated
USING (auth.uid() = user_id);
