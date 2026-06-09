-- ============================================================
-- Award XP automatically when users publish spot videos.
-- Backfills existing spot/video activity and recalculates profiles.
-- ============================================================

ALTER TABLE public.xp_logs
  DROP CONSTRAINT IF EXISTS xp_logs_origem_check;

ALTER TABLE public.xp_logs
  ADD CONSTRAINT xp_logs_origem_check
  CHECK (origem IN ('spot', 'video', 'manobra', 'combo', 'like', 'badge', 'admin'));

CREATE INDEX IF NOT EXISTS idx_xp_logs_reference
  ON public.xp_logs(user_id, origem, referencia_id);

CREATE OR REPLACE FUNCTION public.bs_award_spot_video_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spot_author UUID;
BEGIN
  IF COALESCE(NEW.ativo, TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  IF NEW.autor_id IS NOT NULL THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      NEW.autor_id,
      'video',
      NEW.id,
      40,
      'Video publicado num spot'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = NEW.autor_id
        AND origem = 'video'
        AND referencia_id = NEW.id
        AND descricao = 'Video publicado num spot'
    );
  END IF;

  SELECT criador_id
  INTO spot_author
  FROM public.spots
  WHERE id = NEW.spot_id;

  IF spot_author IS NOT NULL THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      spot_author,
      'spot',
      NEW.spot_id,
      60,
      'Spot com video publicado'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = spot_author
        AND origem = 'spot'
        AND referencia_id = NEW.spot_id
        AND descricao = 'Spot com video publicado'
    );
  END IF;

  IF NEW.autor_id IS NOT NULL THEN
    PERFORM public.bs_recalcular_perfil_xp(NEW.autor_id);
  END IF;

  IF spot_author IS NOT NULL AND spot_author IS DISTINCT FROM NEW.autor_id THEN
    PERFORM public.bs_recalcular_perfil_xp(spot_author);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_spot_video_xp_insert ON public.spot_videos;
CREATE TRIGGER trg_award_spot_video_xp_insert
AFTER INSERT ON public.spot_videos
FOR EACH ROW
EXECUTE FUNCTION public.bs_award_spot_video_xp();

DROP TRIGGER IF EXISTS trg_award_spot_video_xp_active_update ON public.spot_videos;
CREATE TRIGGER trg_award_spot_video_xp_active_update
AFTER UPDATE OF ativo ON public.spot_videos
FOR EACH ROW
WHEN (OLD.ativo IS DISTINCT FROM NEW.ativo AND NEW.ativo = TRUE)
EXECUTE FUNCTION public.bs_award_spot_video_xp();

-- Existing videos: +40 XP per published video.
INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
SELECT
  video.autor_id,
  'video',
  video.id,
  40,
  'Video publicado num spot'
FROM public.spot_videos video
WHERE COALESCE(video.ativo, TRUE) = TRUE
  AND video.autor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.xp_logs existing
    WHERE existing.user_id = video.autor_id
      AND existing.origem = 'video'
      AND existing.referencia_id = video.id
      AND existing.descricao = 'Video publicado num spot'
  );

-- Existing spots that already have at least one active video: +60 XP once per spot.
INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
SELECT
  spot.criador_id,
  'spot',
  spot.id,
  60,
  'Spot com video publicado'
FROM public.spots spot
WHERE spot.criador_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.spot_videos video
    WHERE video.spot_id = spot.id
      AND COALESCE(video.ativo, TRUE) = TRUE
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.xp_logs existing
    WHERE existing.user_id = spot.criador_id
      AND existing.origem = 'spot'
      AND existing.referencia_id = spot.id
      AND existing.descricao = 'Spot com video publicado'
  );

DO $$
DECLARE
  affected_user UUID;
BEGIN
  FOR affected_user IN
    SELECT DISTINCT user_id
    FROM public.xp_logs
  LOOP
    PERFORM public.bs_recalcular_perfil_xp(affected_user);
  END LOOP;
END $$;
