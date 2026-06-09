ALTER TABLE public.spot_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spot_videos_select_visible ON public.spot_videos;
CREATE POLICY spot_videos_select_visible ON public.spot_videos
  FOR SELECT USING (
    ativo = TRUE
    OR auth.uid() = autor_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spot_videos_insert_own ON public.spot_videos;
CREATE POLICY spot_videos_insert_own ON public.spot_videos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND autor_id = auth.uid()
  );

DROP POLICY IF EXISTS spot_videos_manage_own ON public.spot_videos;
CREATE POLICY spot_videos_manage_own ON public.spot_videos
  FOR UPDATE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spot_videos_delete_own ON public.spot_videos;
CREATE POLICY spot_videos_delete_own ON public.spot_videos
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );
