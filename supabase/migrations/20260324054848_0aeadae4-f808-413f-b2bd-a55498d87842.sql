
CREATE POLICY "Users can update own checkins"
ON public.checkins FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
