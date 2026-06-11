-- ============================================================
-- BoardSports security lockdown for the public Supabase backend.
--
-- This migration assumes the frontend uses the public anon key, which is
-- normal in Supabase. The database must therefore reject privilege escalation
-- and sensitive writes even when a user calls the REST API from DevTools.
-- ============================================================

-- Keep the single real administrator pinned in the database layer.
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND is_admin = TRUE
      AND ativo = TRUE
      AND LOWER(email) = 'tiagomendessss2022@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;

-- Remove accidental admin privileges from every other profile.
UPDATE public.profiles
SET is_admin = FALSE
WHERE LOWER(COALESCE(email, '')) <> 'tiagomendessss2022@gmail.com'
  AND COALESCE(is_admin, FALSE) = TRUE;

UPDATE public.profiles
SET is_admin = TRUE,
    ativo = TRUE
WHERE LOWER(email) = 'tiagomendessss2022@gmail.com';

-- Users may edit their public profile fields, but must never be able to
-- escalate privileges or forge XP/account-state fields through DevTools.
CREATE OR REPLACE FUNCTION public.bs_lock_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_is_admin BOOLEAN := public.is_admin_user(current_user_id);
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF current_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM current_user_id THEN
      RAISE EXCEPTION 'PROFILE_INSERT_NOT_ALLOWED';
    END IF;

    NEW.is_admin := FALSE;
    NEW.role := COALESCE(NULLIF(NEW.role, ''), 'atleta');
    NEW.ativo := TRUE;
    NEW.email_verificado := COALESCE(NEW.email_verificado, FALSE);

    IF to_jsonb(NEW) ? 'xp_total' THEN
      NEW.xp_total := 0;
    END IF;

    IF to_jsonb(NEW) ? 'nivel_xp' THEN
      NEW.nivel_xp := 1;
    END IF;

    IF to_jsonb(NEW) ? 'tipo_user' THEN
      NEW.tipo_user := COALESCE(NULLIF(NEW.tipo_user, ''), 'principiante');
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'PROFILE_ID_LOCKED';
  END IF;

  IF current_user_id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'PROFILE_UPDATE_NOT_ALLOWED';
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.email_verificado IS DISTINCT FROM OLD.email_verificado
     OR NEW.data_verificacao_email IS DISTINCT FROM OLD.data_verificacao_email THEN
    RAISE EXCEPTION 'PROFILE_PRIVILEGE_FIELDS_LOCKED';
  END IF;

  IF (to_jsonb(NEW) ? 'xp_total') AND NEW.xp_total IS DISTINCT FROM OLD.xp_total THEN
    RAISE EXCEPTION 'PROFILE_XP_LOCKED';
  END IF;

  IF (to_jsonb(NEW) ? 'nivel_xp') AND NEW.nivel_xp IS DISTINCT FROM OLD.nivel_xp THEN
    RAISE EXCEPTION 'PROFILE_XP_LOCKED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_lock_profile_sensitive_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.bs_lock_profile_sensitive_fields();

-- Content created by normal users must not be able to bypass moderation by
-- setting public/active flags manually.
CREATE OR REPLACE FUNCTION public.bs_lock_spot_publication_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_is_admin BOOLEAN := public.is_admin_user(current_user_id);
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF current_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.criador_id IS DISTINCT FROM current_user_id THEN
      RAISE EXCEPTION 'SPOT_INSERT_NOT_ALLOWED';
    END IF;

    NEW.publico := FALSE;
    NEW.ativo := TRUE;
    RETURN NEW;
  END IF;

  IF current_user_id IS DISTINCT FROM OLD.criador_id THEN
    RAISE EXCEPTION 'SPOT_UPDATE_NOT_ALLOWED';
  END IF;

  IF NEW.criador_id IS DISTINCT FROM OLD.criador_id
     OR NEW.publico IS DISTINCT FROM OLD.publico
     OR NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'SPOT_MODERATION_FIELDS_LOCKED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_spot_publication_fields ON public.spots;
CREATE TRIGGER trg_lock_spot_publication_fields
BEFORE INSERT OR UPDATE ON public.spots
FOR EACH ROW
EXECUTE FUNCTION public.bs_lock_spot_publication_fields();

-- Videos may be created by the logged-in author, but users cannot forge the
-- author, analysis score or activation state from the browser console.
CREATE OR REPLACE FUNCTION public.bs_lock_spot_video_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_is_admin BOOLEAN := public.is_admin_user(current_user_id);
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF current_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.autor_id IS DISTINCT FROM current_user_id THEN
      RAISE EXCEPTION 'VIDEO_INSERT_NOT_ALLOWED';
    END IF;

    NEW.ativo := TRUE;
    NEW.analise_score := COALESCE(NEW.analise_score, 0);
    NEW.analise_resultado := COALESCE(NEW.analise_resultado, '{}'::jsonb);
    RETURN NEW;
  END IF;

  IF current_user_id IS DISTINCT FROM OLD.autor_id THEN
    RAISE EXCEPTION 'VIDEO_UPDATE_NOT_ALLOWED';
  END IF;

  IF NEW.autor_id IS DISTINCT FROM OLD.autor_id
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.analise_score IS DISTINCT FROM OLD.analise_score
     OR NEW.analise_resultado IS DISTINCT FROM OLD.analise_resultado THEN
    RAISE EXCEPTION 'VIDEO_SENSITIVE_FIELDS_LOCKED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_spot_video_sensitive_fields ON public.spot_videos;
CREATE TRIGGER trg_lock_spot_video_sensitive_fields
BEFORE INSERT OR UPDATE ON public.spot_videos
FOR EACH ROW
EXECUTE FUNCTION public.bs_lock_spot_video_sensitive_fields();

-- Make sure all sensitive/community tables still have RLS enabled.
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spot_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.solicitacoes_publicacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.denuncias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spot_favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spot_imagens ENABLE ROW LEVEL SECURITY;

-- Recreate critical policies with explicit owner/admin boundaries.
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spots_insert_own ON public.spots;
CREATE POLICY spots_insert_own ON public.spots
  FOR INSERT WITH CHECK (auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spots_manage_own ON public.spots;
CREATE POLICY spots_manage_own ON public.spots
  FOR UPDATE USING (auth.uid() = criador_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_videos_insert_own ON public.spot_videos;
CREATE POLICY spot_videos_insert_own ON public.spot_videos
  FOR INSERT WITH CHECK (auth.uid() = autor_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_videos_manage_own ON public.spot_videos;
CREATE POLICY spot_videos_manage_own ON public.spot_videos
  FOR UPDATE USING (auth.uid() = autor_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = autor_id OR public.is_admin_user(auth.uid()));

-- XP is generated by triggers/admin functions only. Normal users may read only
-- their own XP logs through RLS, but cannot call the recalculation function.
REVOKE ALL ON FUNCTION public.bs_recalcular_perfil_xp(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bs_recalcular_perfil_xp(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.bs_recalcular_perfil_xp(UUID) FROM authenticated;

-- Public utility functions can stay readable, but moderation remains guarded
-- by is_admin_user() and is now pinned to the single admin email above.
GRANT EXECUTE ON FUNCTION public.moderar_submissao_xp(INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderar_solicitacao_publicacao(INT, TEXT, TEXT) TO authenticated;

-- Lock broad grants on private tables. RLS still decides row access; these
-- revokes avoid accidental full-table exposure if a permissive policy appears.
REVOKE INSERT, UPDATE, DELETE ON public.xp_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.submissoes FROM anon;
REVOKE UPDATE, DELETE ON public.submissoes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.denuncias FROM anon;
REVOKE UPDATE, DELETE ON public.denuncias FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notificacoes FROM anon;
REVOKE DELETE ON public.notificacoes FROM authenticated;
