-- ============================================================
-- Video authoring type and XP adjustment.
-- proprio: user appears performing the sport (+40 XP)
-- filmado: user filmed another person (+20 XP)
-- terceiros: third-party video (0 XP)
-- ============================================================

ALTER TABLE public.spot_videos
  ADD COLUMN IF NOT EXISTS tipo_autoria TEXT DEFAULT 'proprio',
  ADD COLUMN IF NOT EXISTS xp_video INT DEFAULT 40;

UPDATE public.spot_videos
SET
  tipo_autoria = COALESCE(tipo_autoria, 'proprio'),
  xp_video = COALESCE(xp_video, 40);

ALTER TABLE public.spot_videos
  DROP CONSTRAINT IF EXISTS spot_videos_tipo_autoria_check;

ALTER TABLE public.spot_videos
  ADD CONSTRAINT spot_videos_tipo_autoria_check
  CHECK (tipo_autoria IN ('proprio', 'filmado', 'terceiros'));

ALTER TABLE public.spot_videos
  DROP CONSTRAINT IF EXISTS spot_videos_xp_video_check;

ALTER TABLE public.spot_videos
  ADD CONSTRAINT spot_videos_xp_video_check
  CHECK (xp_video IN (0, 20, 40));

CREATE OR REPLACE FUNCTION public.bs_award_spot_video_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spot_author UUID;
  video_xp INT;
  video_description TEXT;
BEGIN
  IF COALESCE(NEW.ativo, TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  video_xp := CASE COALESCE(NEW.tipo_autoria, 'proprio')
    WHEN 'proprio' THEN 40
    WHEN 'filmado' THEN 20
    WHEN 'terceiros' THEN 0
    ELSE COALESCE(NEW.xp_video, 40)
  END;

  NEW.xp_video := video_xp;
  video_description := CASE COALESCE(NEW.tipo_autoria, 'proprio')
    WHEN 'filmado' THEN 'Video filmado pelo utilizador num spot'
    WHEN 'terceiros' THEN 'Video de terceiros publicado num spot'
    ELSE 'Video publicado pelo proprio rider num spot'
  END;

  IF NEW.autor_id IS NOT NULL AND video_xp > 0 THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      NEW.autor_id,
      'video',
      NEW.id,
      video_xp,
      video_description
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = NEW.autor_id
        AND origem = 'video'
        AND referencia_id = NEW.id
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

UPDATE public.xp_logs AS log
SET
  xp_ganho = CASE COALESCE(video.tipo_autoria, 'proprio')
    WHEN 'proprio' THEN 40
    WHEN 'filmado' THEN 20
    WHEN 'terceiros' THEN 0
    ELSE COALESCE(video.xp_video, 40)
  END,
  descricao = CASE COALESCE(video.tipo_autoria, 'proprio')
    WHEN 'filmado' THEN 'Video filmado pelo utilizador num spot'
    WHEN 'terceiros' THEN 'Video de terceiros publicado num spot'
    ELSE 'Video publicado pelo proprio rider num spot'
  END
FROM public.spot_videos video
WHERE log.origem = 'video'
  AND log.referencia_id = video.id;

DELETE FROM public.xp_logs
USING public.spot_videos video
WHERE xp_logs.origem = 'video'
  AND xp_logs.referencia_id = video.id
  AND COALESCE(video.tipo_autoria, 'proprio') = 'terceiros';

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
