-- Reports should reach admins directly, and moderation actions must happen
-- through guarded RPCs instead of broad client-side table updates.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS timeout_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_moderation_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_moderation_status_check
      CHECK (moderation_status IN ('active', 'timeout', 'banned'));
  END IF;
END $$;

ALTER TABLE public.profiles DISABLE TRIGGER trg_lock_profile_sensitive_fields;

UPDATE public.profiles
SET moderation_status = CASE
  WHEN ativo = FALSE THEN 'banned'
  WHEN moderation_status IS NULL OR moderation_status = '' THEN 'active'
  ELSE moderation_status
END;

ALTER TABLE public.profiles ENABLE TRIGGER trg_lock_profile_sensitive_fields;

GRANT SELECT (
  moderation_status,
  timeout_until,
  ban_reason,
  moderated_by,
  moderated_at
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS spots_select_all ON public.spots;
DROP POLICY IF EXISTS spots_select_public_approved ON public.spots;
DROP POLICY IF EXISTS spots_select_public_active ON public.spots;
CREATE POLICY spots_select_public_active ON public.spots
  FOR SELECT
  TO anon
  USING (ativo = TRUE AND publico = TRUE);

DROP POLICY IF EXISTS spots_select_authenticated_active ON public.spots;
CREATE POLICY spots_select_authenticated_active ON public.spots
  FOR SELECT
  TO authenticated
  USING (
    (ativo = TRUE AND publico = TRUE)
    OR auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.bs_is_restricted_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        COALESCE(p.ativo, TRUE) = FALSE
        OR p.moderation_status = 'banned'
        OR (
          p.moderation_status = 'timeout'
          AND p.timeout_until IS NOT NULL
          AND p.timeout_until > NOW()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.bs_is_restricted_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bs_is_restricted_user(UUID) FROM authenticated;

CREATE OR REPLACE FUNCTION public.bs_guard_restricted_user_writes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NOT NULL AND public.bs_is_restricted_user(v_user) THEN
    RAISE EXCEPTION 'USER_RESTRICTED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_restricted_spot_writes ON public.spots;
CREATE TRIGGER trg_block_restricted_spot_writes
  BEFORE INSERT OR UPDATE ON public.spots
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_guard_restricted_user_writes();

DROP TRIGGER IF EXISTS trg_block_restricted_video_writes ON public.spot_videos;
CREATE TRIGGER trg_block_restricted_video_writes
  BEFORE INSERT OR UPDATE ON public.spot_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_guard_restricted_user_writes();

DROP TRIGGER IF EXISTS trg_block_restricted_denuncia_writes ON public.denuncias;
CREATE TRIGGER trg_block_restricted_denuncia_writes
  BEFORE INSERT OR UPDATE ON public.denuncias
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_guard_restricted_user_writes();

DROP TRIGGER IF EXISTS trg_block_restricted_comentario_writes ON public.comentarios;
CREATE TRIGGER trg_block_restricted_comentario_writes
  BEFORE INSERT OR UPDATE ON public.comentarios
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_guard_restricted_user_writes();

DROP TRIGGER IF EXISTS trg_block_restricted_spot_image_writes ON public.spot_imagens;
CREATE TRIGGER trg_block_restricted_spot_image_writes
  BEFORE INSERT OR UPDATE ON public.spot_imagens
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_guard_restricted_user_writes();

DROP TRIGGER IF EXISTS trg_block_restricted_favorite_writes ON public.spot_favoritos;
CREATE TRIGGER trg_block_restricted_favorite_writes
  BEFORE INSERT OR UPDATE ON public.spot_favoritos
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_guard_restricted_user_writes();

CREATE OR REPLACE FUNCTION public.bs_notify_admins_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_row RECORD;
  report_title TEXT;
  report_message TEXT;
BEGIN
  IF NEW.estado IS DISTINCT FROM 'pendente' THEN
    RETURN NEW;
  END IF;

  report_title := 'Nova denuncia de ' || COALESCE(NEW.entidade_tipo, 'conteudo');
  report_message := COALESCE(NULLIF(BTRIM(NEW.motivo), ''), 'Foi recebida uma nova denuncia para moderacao.');

  FOR admin_row IN
    SELECT id
    FROM public.profiles
    WHERE is_admin = TRUE
      AND COALESCE(ativo, TRUE) = TRUE
  LOOP
    PERFORM public.bs_notify(
      admin_row.id,
      'denuncia_admin',
      report_title,
      report_message,
      '/moderacao.html',
      jsonb_build_object(
        'denuncia_id', NEW.id,
        'entidade_tipo', NEW.entidade_tipo,
        'entidade_id', NEW.entidade_id,
        'denunciante_id', NEW.denunciante_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_report ON public.denuncias;
CREATE TRIGGER trg_notify_admins_new_report
  AFTER INSERT ON public.denuncias
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_notify_admins_new_report();

CREATE OR REPLACE FUNCTION public.admin_excluir_spot(
  p_spot_id INT,
  p_denuncia_id BIGINT DEFAULT NULL,
  p_nota_admin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  spot_row public.spots%ROWTYPE;
  report_row public.denuncias%ROWTYPE;
  note TEXT := COALESCE(NULLIF(BTRIM(p_nota_admin), ''), 'O spot foi removido pela moderacao.');
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin_user(v_admin) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT * INTO spot_row FROM public.spots WHERE id = p_spot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SPOT_NOT_FOUND';
  END IF;

  UPDATE public.spots
  SET ativo = FALSE,
      publico = FALSE,
      data_atualizacao = NOW()
  WHERE id = p_spot_id;

  PERFORM public.bs_notify(
    spot_row.criador_id,
    'spot_removido',
    'Spot removido',
    note,
    '/notificacoes.html',
    jsonb_build_object('spot_id', p_spot_id, 'admin_id', v_admin)
  );

  IF p_denuncia_id IS NOT NULL THEN
    SELECT * INTO report_row FROM public.denuncias WHERE id = p_denuncia_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.denuncias
      SET estado = 'resolvida',
          nota_admin = note,
          moderador_id = v_admin,
          data_decisao = NOW()
      WHERE id = p_denuncia_id;

      PERFORM public.bs_notify(
        report_row.denunciante_id,
        'denuncia_resolvida',
        'Denuncia resolvida',
        note,
        '/notificacoes.html',
        jsonb_build_object('denuncia_id', report_row.id, 'spot_id', p_spot_id)
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('spot_id', p_spot_id, 'ativo', FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_banir_user(
  p_user_id UUID,
  p_denuncia_id BIGINT DEFAULT NULL,
  p_nota_admin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  report_row public.denuncias%ROWTYPE;
  note TEXT := COALESCE(NULLIF(BTRIM(p_nota_admin), ''), 'Conta banida pela moderacao.');
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin_user(v_admin) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_user_id IS NULL OR p_user_id = v_admin THEN
    RAISE EXCEPTION 'INVALID_USER';
  END IF;

  IF public.is_admin_user(p_user_id) THEN
    RAISE EXCEPTION 'CANNOT_MODERATE_ADMIN';
  END IF;

  UPDATE public.profiles
  SET ativo = FALSE,
      moderation_status = 'banned',
      timeout_until = NULL,
      ban_reason = note,
      moderated_by = v_admin,
      moderated_at = NOW(),
      data_atualizacao = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  PERFORM public.bs_notify(
    p_user_id,
    'conta_banida',
    'Conta banida',
    note,
    '/notificacoes.html',
    jsonb_build_object('admin_id', v_admin, 'denuncia_id', p_denuncia_id)
  );

  IF p_denuncia_id IS NOT NULL THEN
    SELECT * INTO report_row FROM public.denuncias WHERE id = p_denuncia_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.denuncias
      SET estado = 'resolvida',
          nota_admin = note,
          moderador_id = v_admin,
          data_decisao = NOW()
      WHERE id = p_denuncia_id;

      PERFORM public.bs_notify(
        report_row.denunciante_id,
        'denuncia_resolvida',
        'Denuncia resolvida',
        note,
        '/notificacoes.html',
        jsonb_build_object('denuncia_id', report_row.id, 'user_id', p_user_id)
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('user_id', p_user_id, 'status', 'banned');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_timeout_user(
  p_user_id UUID,
  p_timeout_until TIMESTAMPTZ,
  p_denuncia_id BIGINT DEFAULT NULL,
  p_nota_admin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  report_row public.denuncias%ROWTYPE;
  note TEXT := COALESCE(NULLIF(BTRIM(p_nota_admin), ''), 'Conta em timeout temporario pela moderacao.');
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin_user(v_admin) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_user_id IS NULL OR p_user_id = v_admin THEN
    RAISE EXCEPTION 'INVALID_USER';
  END IF;

  IF public.is_admin_user(p_user_id) THEN
    RAISE EXCEPTION 'CANNOT_MODERATE_ADMIN';
  END IF;

  IF p_timeout_until IS NULL OR p_timeout_until <= NOW() THEN
    RAISE EXCEPTION 'INVALID_TIMEOUT';
  END IF;

  UPDATE public.profiles
  SET ativo = TRUE,
      moderation_status = 'timeout',
      timeout_until = p_timeout_until,
      ban_reason = note,
      moderated_by = v_admin,
      moderated_at = NOW(),
      data_atualizacao = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  PERFORM public.bs_notify(
    p_user_id,
    'conta_timeout',
    'Conta em timeout',
    note || ' Ate: ' || p_timeout_until::TEXT,
    '/notificacoes.html',
    jsonb_build_object('admin_id', v_admin, 'timeout_until', p_timeout_until, 'denuncia_id', p_denuncia_id)
  );

  IF p_denuncia_id IS NOT NULL THEN
    SELECT * INTO report_row FROM public.denuncias WHERE id = p_denuncia_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.denuncias
      SET estado = 'resolvida',
          nota_admin = note,
          moderador_id = v_admin,
          data_decisao = NOW()
      WHERE id = p_denuncia_id;

      PERFORM public.bs_notify(
        report_row.denunciante_id,
        'denuncia_resolvida',
        'Denuncia resolvida',
        note,
        '/notificacoes.html',
        jsonb_build_object('denuncia_id', report_row.id, 'user_id', p_user_id)
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('user_id', p_user_id, 'status', 'timeout', 'timeout_until', p_timeout_until);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_excluir_spot(INT, BIGINT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_banir_user(UUID, BIGINT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_timeout_user(UUID, TIMESTAMPTZ, BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_excluir_spot(INT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_banir_user(UUID, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_timeout_user(UUID, TIMESTAMPTZ, BIGINT, TEXT) TO authenticated;
