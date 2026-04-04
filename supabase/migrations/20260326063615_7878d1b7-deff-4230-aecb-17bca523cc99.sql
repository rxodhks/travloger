
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
    actor_name := '멤버';
  END IF;

  -- Determine notification type based on table
  IF TG_TABLE_NAME = 'checkins' THEN
    notif_type := 'checkin';
    notif_title := '새로운 체크인';
    notif_message := actor_name || '님이 ' || COALESCE(NEW.location, '어딘가') || '에서 체크인했습니다';
    pref_column := 'checkin_notify';
  ELSIF TG_TABLE_NAME = 'memories' THEN
    notif_type := 'memory';
    notif_title := '새로운 추억';
    notif_message := actor_name || '님이 새로운 추억을 기록했습니다';
    pref_column := 'memory_notify';
  ELSIF TG_TABLE_NAME = 'trip_plans' THEN
    notif_type := 'trip_plan';
    notif_title := '새로운 여행 계획';
    notif_message := actor_name || '님이 "' || COALESCE(NEW.title, '여행') || '" 계획을 만들었습니다';
    pref_column := 'trip_plan_notify';
  ELSIF TG_TABLE_NAME = 'group_members' THEN
    notif_type := 'member_join';
    SELECT name INTO grp_name FROM public.groups WHERE id = NEW.group_id LIMIT 1;
    notif_title := '새 멤버 참가';
    notif_message := actor_name || '님이 "' || COALESCE(grp_name, '그룹') || '"에 참가했습니다';
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
