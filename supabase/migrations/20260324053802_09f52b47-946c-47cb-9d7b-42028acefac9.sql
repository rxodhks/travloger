
-- Create a security definer function to check group membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
DROP POLICY IF EXISTS "Owner can manage groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Owner can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

-- Recreate groups policies using the helper function
CREATE POLICY "Owner can manage groups"
ON public.groups FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view their groups"
ON public.groups FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), id));

-- Recreate group_members policies using the helper function
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can join groups"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can manage members"
ON public.group_members FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.groups g
  WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.groups g
  WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
));

-- Also fix checkins policy that references group_members
DROP POLICY IF EXISTS "Users can view relevant checkins" ON public.checkins;
CREATE POLICY "Users can view relevant checkins"
ON public.checkins FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (couple_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM couples c
    WHERE c.id = checkins.couple_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ))
  OR (group_id IS NOT NULL AND public.is_group_member(auth.uid(), checkins.group_id))
);
