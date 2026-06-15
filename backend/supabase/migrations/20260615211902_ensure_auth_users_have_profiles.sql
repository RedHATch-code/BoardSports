-- Ensure every authenticated user has a matching public profile row.
-- The frontend also calls garantirPerfilUtilizador(), but doing this in the
-- database prevents users from getting stuck if profile creation fails client-side.

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
  -- Database-owned auth/profile maintenance runs without a JWT. Keep this
  -- limited to trusted internal roles; browser/API users still need auth.uid().
  IF current_user_id IS NULL THEN
    IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') THEN
      IF TG_OP = 'INSERT' THEN
        NEW.is_admin := COALESCE(NEW.is_admin, FALSE);
        NEW.role := COALESCE(NULLIF(NEW.role, ''), 'atleta');
        NEW.ativo := COALESCE(NEW.ativo, TRUE);
        NEW.email_verificado := COALESCE(NEW.email_verificado, FALSE);
        NEW.xp_total := COALESCE(NEW.xp_total, 0);
        NEW.nivel_xp := COALESCE(NEW.nivel_xp, 1);
        NEW.tipo_user := COALESCE(NULLIF(NEW.tipo_user, ''), 'principiante');
        NEW.moderation_status := COALESCE(NULLIF(NEW.moderation_status, ''), 'active');
      END IF;

      RETURN NEW;
    END IF;

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
    NEW.xp_total := COALESCE(NEW.xp_total, 0);
    NEW.nivel_xp := COALESCE(NEW.nivel_xp, 1);
    NEW.tipo_user := COALESCE(NULLIF(NEW.tipo_user, ''), 'principiante');
    NEW.moderation_status := COALESCE(NULLIF(NEW.moderation_status, ''), 'active');

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
     OR NEW.data_verificacao_email IS DISTINCT FROM OLD.data_verificacao_email
     OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     OR NEW.timeout_until IS DISTINCT FROM OLD.timeout_until
     OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
     OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
     OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN
    RAISE EXCEPTION 'PROFILE_PRIVILEGE_FIELDS_LOCKED';
  END IF;

  IF NEW.xp_total IS DISTINCT FROM OLD.xp_total
     OR NEW.nivel_xp IS DISTINCT FROM OLD.nivel_xp THEN
    RAISE EXCEPTION 'PROFILE_XP_LOCKED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bs_create_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data JSONB := COALESCE(NEW.raw_user_meta_data -> 'profile', '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    nome,
    email,
    telefone,
    bio,
    localidade,
    ativo,
    email_verificado,
    data_verificacao_email,
    tipo_user,
    xp_total,
    nivel_xp,
    moderation_status
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), NULLIF(profile_data ->> 'role', ''), 'atleta'),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nome', ''), NULLIF(profile_data ->> 'nome', '')),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'telefone', ''), NULLIF(profile_data ->> 'telefone', '')),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'bio', ''), NULLIF(profile_data ->> 'bio', '')),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'localidade', ''), NULLIF(profile_data ->> 'localidade', '')),
    TRUE,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.email_confirmed_at,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'tipo_user', ''), NULLIF(profile_data ->> 'tipo_user', ''), 'principiante'),
    0,
    1,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    ativo = COALESCE(public.profiles.ativo, TRUE),
    moderation_status = COALESCE(NULLIF(public.profiles.moderation_status, ''), 'active'),
    email_verificado = public.profiles.email_verificado OR EXCLUDED.email_verificado,
    data_verificacao_email = COALESCE(public.profiles.data_verificacao_email, EXCLUDED.data_verificacao_email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_profile_for_auth_user ON auth.users;
CREATE TRIGGER trg_create_profile_for_auth_user
AFTER INSERT OR UPDATE OF email, email_confirmed_at, raw_user_meta_data ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.bs_create_profile_for_auth_user();

INSERT INTO public.profiles (
  id,
  role,
  nome,
  email,
  ativo,
  email_verificado,
  data_verificacao_email,
  tipo_user,
  xp_total,
  nivel_xp,
  moderation_status
)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'role', ''), NULLIF(u.raw_user_meta_data -> 'profile' ->> 'role', ''), 'atleta'),
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'nome', ''), NULLIF(u.raw_user_meta_data -> 'profile' ->> 'nome', ''), split_part(u.email, '@', 1)),
  u.email,
  TRUE,
  u.email_confirmed_at IS NOT NULL,
  u.email_confirmed_at,
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'tipo_user', ''), NULLIF(u.raw_user_meta_data -> 'profile' ->> 'tipo_user', ''), 'principiante'),
  0,
  1,
  'active'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;
