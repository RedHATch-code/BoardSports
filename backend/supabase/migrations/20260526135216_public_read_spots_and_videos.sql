-- Make spots and spot videos readable by every visitor/user.
-- Write access remains controlled by the existing authenticated owner/admin policies.

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_videos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.spots TO anon, authenticated;
GRANT SELECT ON public.spot_videos TO anon, authenticated;

DROP POLICY IF EXISTS spots_select_public_approved ON public.spots;
DROP POLICY IF EXISTS spots_select_all ON public.spots;

CREATE POLICY spots_select_all ON public.spots
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS spot_videos_select_visible ON public.spot_videos;
DROP POLICY IF EXISTS spot_videos_select_all ON public.spot_videos;

CREATE POLICY spot_videos_select_all ON public.spot_videos
  FOR SELECT
  TO anon, authenticated
  USING (true);
