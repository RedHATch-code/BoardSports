-- ============================================================
-- Hide private profile fields from public API reads.
--
-- The frontend still needs public rider names, avatars and XP for spots,
-- videos and leaderboards. Emails/admin flags stay readable only through
-- owner/admin profile access or exact authenticated lookup for messaging.
-- ============================================================

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
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
FROM public.profiles
WHERE ativo = TRUE;

REVOKE ALL ON public.public_profiles FROM PUBLIC;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

DROP POLICY IF EXISTS profiles_select_visible ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.buscar_perfil_por_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  nome VARCHAR,
  email VARCHAR,
  foto_perfil VARCHAR,
  role VARCHAR,
  bio TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.nome,
    p.email,
    p.foto_perfil,
    p.role,
    p.bio
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.ativo = TRUE
    AND LOWER(p.email) = LOWER(BTRIM(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.buscar_perfil_por_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_perfil_por_email(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.leaderboard_por_desporto(p_modalidade_id INT)
RETURNS TABLE (
  id UUID,
  nome VARCHAR,
  email VARCHAR,
  foto_perfil VARCHAR,
  xp_total INT,
  nivel_xp INT,
  tipo_user VARCHAR,
  xp_ranking BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.nome,
    NULL::VARCHAR AS email,
    p.foto_perfil,
    p.xp_total,
    p.nivel_xp,
    p.tipo_user,
    COALESCE(SUM(x.xp_ganho), 0)::BIGINT AS xp_ranking
  FROM public.profiles p
  JOIN public.xp_logs x ON x.user_id = p.id
  LEFT JOIN public.submissoes s ON s.id = x.referencia_id
  LEFT JOIN public.spots sp ON sp.id = s.spot_id
  LEFT JOIN public.manobras m ON m.id = s.manobra_id
  WHERE p.ativo = TRUE
    AND COALESCE(sp.modalidade_id, m.modalidade_id) = p_modalidade_id
  GROUP BY p.id, p.nome, p.foto_perfil, p.xp_total, p.nivel_xp, p.tipo_user
  ORDER BY xp_ranking DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.leaderboard_por_desporto(INT) TO authenticated, anon;
