ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spots_delete_own ON public.spots;
CREATE POLICY spots_delete_own ON public.spots
  FOR DELETE TO authenticated
  USING (
    criador_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spots_update_own ON public.spots;
CREATE POLICY spots_update_own ON public.spots
  FOR UPDATE TO authenticated
  USING (
    criador_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    criador_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spot_videos_delete_own ON public.spot_videos;
CREATE POLICY spot_videos_delete_own ON public.spot_videos
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );
