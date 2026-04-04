
CREATE TABLE public.group_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KRW',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '기타',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group expenses"
  ON public.group_expenses FOR SELECT TO authenticated
  USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can insert group expenses"
  ON public.group_expenses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can update own expenses"
  ON public.group_expenses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON public.group_expenses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
