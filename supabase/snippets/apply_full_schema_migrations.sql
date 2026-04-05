/*
 * Travloger — 전체 DB 스키마 한 번에 적용
 *
 * 사용: Supabase Dashboard → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
 *
 * 조건: 새 프로젝트이거나, public 스키마를 비운 뒤에만 실행하세요.
 *       이미 일부 테이블이 있으면 중간에 "already exists" 오류가 날 수 있습니다.
 *
 * 적용 후: Dashboard → Settings → API → Reload schema (또는 1~2분 대기)
 *
 * Edge Functions CORS/404: DB와 별개로, 함수가 배포되지 않으면 OPTIONS가 실패합니다.
 *   supabase login
 *   supabase link --project-ref <프로젝트 ref>
 *   supabase functions deploy check-subscription create-checkout create-toss-payment confirm-toss-payment customer-portal exchange-rates archive-expired-trips
 *   (AI는 Vercel /api 로 쓰는 경우 optimize-route, ai-travel-recommend 배포 생략 가능)
 *
 * 각 함수에 필요한 Secrets 는 Supabase Dashboard → Edge Functions → Secrets 에 설정하세요.
 */


-- ========== 20260324012615_ceb7fbe1-6a7f-40a1-abb2-63af2073539b.sql ==========

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create memories table to store posts
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  mood TEXT,
  location TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view memories"
ON public.memories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create memories"
ON public.memories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
ON public.memories FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
ON public.memories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========== 20260324012939_f6fc6cd7-d073-4df1-9348-ab9136b7a26e.sql ==========

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_emoji TEXT NOT NULL DEFAULT '?삃',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create couples table
CREATE TABLE public.couples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected')),
  anniversary DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own couple" ON public.couples FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create a couple" ON public.couples FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user1_id);
CREATE POLICY "Users can update their own couple" ON public.couples FOR UPDATE TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 20260324051317_4212cd34-117a-4ac6-8ae3-010e4d50de26.sql ==========


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


-- ========== 20260324051716_77acc787-a94d-49f8-aedf-2511b3a292cc.sql ==========


-- Checkins table with group association
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '?뱧',
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


-- ========== 20260324053802_09f52b47-946c-47cb-9d7b-42028acefac9.sql ==========


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


-- ========== 20260324054136_418d9862-29c1-4938-89ae-b3b22c17acd5.sql ==========


-- Create trip_plans table
CREATE TABLE public.trip_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '怨꾪쉷以?,
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


-- ========== 20260324054848_0aeadae4-f808-413f-b2bd-a55498d87842.sql ==========


CREATE POLICY "Users can update own checkins"
ON public.checkins FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ========== 20260326051713_4f9f56b0-178f-4fe2-b3eb-a993adf58d96.sql ==========

ALTER TABLE public.checkins ADD COLUMN map_type text NOT NULL DEFAULT 'domestic';

-- ========== 20260326063615_7878d1b7-deff-4230-aecb-17bca523cc99.sql ==========


-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checkin_notify boolean NOT NULL DEFAULT true,
  memory_notify boolean NOT NULL DEFAULT true,
  member_join_notify boolean NOT NULL DEFAULT true,
  trip_plan_notify boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- System can insert notifications (service role)
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to create notification for group/couple members
CREATE OR REPLACE FUNCTION public.notify_group_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  actor_name text;
  grp_name text;
  couple_record record;
  member_record record;
  notif_type text;
  notif_title text;
  notif_message text;
  pref_column text;
BEGIN
  -- Get actor display name
  SELECT display_name INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  IF actor_name IS NULL OR actor_name = '' THEN
    actor_name := '硫ㅻ쾭';
  END IF;

  -- Determine notification type based on table
  IF TG_TABLE_NAME = 'checkins' THEN
    notif_type := 'checkin';
    notif_title := '?덈줈??泥댄겕??;
    notif_message := actor_name || '?섏씠 ' || COALESCE(NEW.location, '?대뵖媛') || '?먯꽌 泥댄겕?명뻽?듬땲??;
    pref_column := 'checkin_notify';
  ELSIF TG_TABLE_NAME = 'memories' THEN
    notif_type := 'memory';
    notif_title := '?덈줈??異붿뼲';
    notif_message := actor_name || '?섏씠 ?덈줈??異붿뼲??湲곕줉?덉뒿?덈떎';
    pref_column := 'memory_notify';
  ELSIF TG_TABLE_NAME = 'trip_plans' THEN
    notif_type := 'trip_plan';
    notif_title := '?덈줈???ы뻾 怨꾪쉷';
    notif_message := actor_name || '?섏씠 "' || COALESCE(NEW.title, '?ы뻾') || '" 怨꾪쉷??留뚮뱾?덉뒿?덈떎';
    pref_column := 'trip_plan_notify';
  ELSIF TG_TABLE_NAME = 'group_members' THEN
    notif_type := 'member_join';
    SELECT name INTO grp_name FROM public.groups WHERE id = NEW.group_id LIMIT 1;
    notif_title := '??硫ㅻ쾭 李멸?';
    notif_message := actor_name || '?섏씠 "' || COALESCE(grp_name, '洹몃９') || '"??李멸??덉뒿?덈떎';
    pref_column := 'member_join_notify';
  END IF;

  -- Notify group members
  IF TG_TABLE_NAME = 'group_members' THEN
    FOR member_record IN
      SELECT gm.user_id FROM public.group_members gm
      WHERE gm.group_id = NEW.group_id AND gm.user_id != NEW.user_id
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.notification_preferences np
        WHERE np.user_id = member_record.user_id
        AND (
          (pref_column = 'member_join_notify' AND np.member_join_notify = false)
        )
      ) THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_id)
        VALUES (member_record.user_id, notif_type, notif_title, notif_message, NEW.id);
      END IF;
    END LOOP;
  ELSIF TG_TABLE_NAME IN ('checkins', 'trip_plans') THEN
    -- Notify via group_id
    IF NEW.group_id IS NOT NULL THEN
      FOR member_record IN
        SELECT gm.user_id FROM public.group_members gm
        WHERE gm.group_id = NEW.group_id AND gm.user_id != NEW.user_id
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = member_record.user_id
          AND (
            (pref_column = 'checkin_notify' AND np.checkin_notify = false) OR
            (pref_column = 'trip_plan_notify' AND np.trip_plan_notify = false)
          )
        ) THEN
          INSERT INTO public.notifications (user_id, type, title, message, related_id)
          VALUES (member_record.user_id, notif_type, notif_title, notif_message, NEW.id);
        END IF;
      END LOOP;
    END IF;
    -- Notify via couple_id
    IF NEW.couple_id IS NOT NULL THEN
      SELECT * INTO couple_record FROM public.couples WHERE id = NEW.couple_id LIMIT 1;
      IF couple_record IS NOT NULL THEN
        IF couple_record.user1_id != NEW.user_id AND couple_record.user1_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, message, related_id)
          VALUES (couple_record.user1_id, notif_type, notif_title, notif_message, NEW.id);
        END IF;
        IF couple_record.user2_id IS NOT NULL AND couple_record.user2_id != NEW.user_id THEN
          INSERT INTO public.notifications (user_id, type, title, message, related_id)
          VALUES (couple_record.user2_id, notif_type, notif_title, notif_message, NEW.id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER on_checkin_notify
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_members();

CREATE TRIGGER on_group_member_join_notify
  AFTER INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_members();

CREATE TRIGGER on_trip_plan_notify
  AFTER INSERT ON public.trip_plans
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_members();


-- ========== 20260326063633_7483886a-afea-4c73-a2b9-764eac694dd3.sql ==========


DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ========== 20260326063759_1b86d846-217a-4452-a1d2-d5f8472ead68.sql ==========

DO $pub$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%already%' OR SQLSTATE = '42710' THEN NULL;
    ELSE RAISE;
    END IF;
END;
$pub$;

-- ========== 20260326071848_3baff2f3-0422-4c7f-983f-1f4e2f21030e.sql ==========


CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- ========== 20260326100434_8fcbb4e8-08b0-4fc4-b17f-f2f29fd22704.sql ==========


CREATE TABLE public.trip_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  places text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT '?꾨즺',
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


-- ========== 20260326100547_328989f1-0c65-4ffa-bb4f-e19f70a6e47a.sql ==========


DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron skipped (플랜/권한): %', SQLERRM;
END;
$ext$;

DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net skipped: %', SQLERRM;
END;
$ext$;


-- ========== 20260326100909_99908bbb-4fad-450e-9391-83af36dcfc06.sql ==========


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


-- ========== 20260326132310_e1843f9d-a823-46b9-874c-1a9aafb77057.sql ==========

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-photos');

-- ========== 20260326133818_4f611670-f304-4396-9bd7-2d1cf4205670.sql ==========

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_url text DEFAULT NULL;

-- ========== 20260328015721_16b2e882-14d8-4a84-adf6-f097cf27fe8e.sql ==========


CREATE TABLE public.group_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KRW',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '湲고?',
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

