-- ============================================================
-- Revoke direct profile private-column access from public API roles.
-- Public profile data must be read through public.public_profiles.
-- ============================================================

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles FORCE ROW LEVEL SECURITY;

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id,
  nome,
  foto_perfil,
  website_url,
  bio,
  localidade,
  role,
  tipo_user,
  xp_total,
  nivel_xp,
  ativo,
  data_criacao
) ON public.profiles TO anon, authenticated;

-- Authenticated users still need these private columns for their own profile
-- and admin checks. RLS restricts rows to owner/admin after the previous
-- migration; anon never receives these columns.
GRANT SELECT (
  email,
  telefone,
  email_verificado,
  data_verificacao_email,
  is_admin,
  data_atualizacao
) ON public.profiles TO authenticated;

REVOKE UPDATE (
  id,
  email,
  role,
  is_admin,
  ativo,
  email_verificado,
  data_verificacao_email,
  xp_total,
  nivel_xp,
  tipo_user,
  data_criacao,
  data_atualizacao
) ON public.profiles FROM anon, authenticated;

GRANT UPDATE (
  nome,
  telefone,
  foto_perfil,
  website_url,
  bio,
  localidade
) ON public.profiles TO authenticated;
