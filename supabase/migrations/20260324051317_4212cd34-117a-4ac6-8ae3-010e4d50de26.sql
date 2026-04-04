
-- Friend groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'friend' CHECK (type IN ('friend')),
  invite_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Owner can manage groups" ON public.groups
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view their groups" ON public.groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
    )
  );

-- Group members policies
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can manage members" ON public.group_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
  );

-- Allow authenticated users to insert themselves as members (joining via invite code)
CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
