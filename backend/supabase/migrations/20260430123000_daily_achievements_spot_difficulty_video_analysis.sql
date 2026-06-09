ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS dificuldade VARCHAR(20) DEFAULT 'facil';

UPDATE public.spots
SET dificuldade = COALESCE(NULLIF(dificuldade, ''), 'facil');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spots_dificuldade_check'
  ) THEN
    ALTER TABLE public.spots
      ADD CONSTRAINT spots_dificuldade_check
      CHECK (dificuldade IN ('facil', 'media', 'dificil'));
  END IF;
END $$;

ALTER TABLE public.spot_videos
  ADD COLUMN IF NOT EXISTS formato VARCHAR(20) DEFAULT 'long',
  ADD COLUMN IF NOT EXISTS plataforma VARCHAR(40),
  ADD COLUMN IF NOT EXISTS analise_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analise_resultado JSONB DEFAULT '{}'::jsonb;

UPDATE public.spot_videos
SET
  formato = COALESCE(NULLIF(formato, ''), 'long'),
  analise_score = COALESCE(analise_score, 0),
  analise_resultado = COALESCE(analise_resultado, '{}'::jsonb);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spot_videos_formato_check'
  ) THEN
    ALTER TABLE public.spot_videos
      ADD CONSTRAINT spot_videos_formato_check
      CHECK (formato IN ('short', 'long'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spot_videos_analise_score_check'
  ) THEN
    ALTER TABLE public.spot_videos
      ADD CONSTRAINT spot_videos_analise_score_check
      CHECK (analise_score BETWEEN 0 AND 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.conquistas_diarias (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  codigo VARCHAR(40) NOT NULL,
  data_conquista DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_ganho INT NOT NULL CHECK (xp_ganho > 0),
  descricao VARCHAR(255),
  data_registo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, codigo, data_conquista)
);

CREATE INDEX IF NOT EXISTS idx_conquistas_diarias_user_date
  ON public.conquistas_diarias(user_id, data_conquista DESC);

ALTER TABLE public.conquistas_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conquistas_diarias_select_own_or_admin ON public.conquistas_diarias;
CREATE POLICY conquistas_diarias_select_own_or_admin ON public.conquistas_diarias
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.reclamar_conquista_diaria(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  normalized_code TEXT := LOWER(BTRIM(COALESCE(p_codigo, '')));
  today DATE := CURRENT_DATE;
  xp_value INT := 0;
  achievement_label TEXT := '';
  evidence_count INT := 0;
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF normalized_code = 'checkin_diario' THEN
    xp_value := 20;
    achievement_label := 'Check-in diario';
    evidence_count := 1;
  ELSIF normalized_code = 'spot_diario' THEN
    xp_value := 60;
    achievement_label := 'Spot do dia';

    SELECT COUNT(*)
    INTO evidence_count
    FROM public.spots
    WHERE criador_id = v_current_user
      AND data_criacao::date = today;
  ELSIF normalized_code = 'video_diario' THEN
    xp_value := 40;
    achievement_label := 'Video do dia';

    SELECT COUNT(*)
    INTO evidence_count
    FROM public.spot_videos
    WHERE autor_id = v_current_user
      AND data_criacao::date = today
      AND ativo = TRUE;
  ELSE
    RAISE EXCEPTION 'INVALID_DAILY_ACHIEVEMENT';
  END IF;

  IF evidence_count <= 0 THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', normalized_code,
      'erro', 'Conquista ainda nao concluida hoje.'
    );
  END IF;

  INSERT INTO public.conquistas_diarias (user_id, codigo, data_conquista, xp_ganho, descricao)
  VALUES (v_current_user, normalized_code, today, xp_value, achievement_label)
  ON CONFLICT (user_id, codigo, data_conquista) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', normalized_code,
      'erro', 'Esta conquista diaria ja foi reclamada hoje.'
    );
  END IF;

  INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
  VALUES (
    v_current_user,
    'badge',
    NULL,
    xp_value,
    CONCAT(achievement_label, ' - conquista diaria')
  );

  PERFORM public.bs_recalcular_perfil_xp(v_current_user);

  RETURN jsonb_build_object(
    'sucesso', true,
    'codigo', normalized_code,
    'xp_ganho', xp_value,
    'descricao', achievement_label
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reclamar_conquista_diaria(TEXT) TO authenticated;
