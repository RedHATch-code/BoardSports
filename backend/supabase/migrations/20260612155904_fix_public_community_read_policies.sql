-- Anonymous reads must not evaluate authenticated-only admin helper functions.

DROP POLICY IF EXISTS comentarios_select_visible ON public.comentarios;
DROP POLICY IF EXISTS comentarios_select_public_active ON public.comentarios;
DROP POLICY IF EXISTS comentarios_select_authenticated_visible ON public.comentarios;

CREATE POLICY comentarios_select_public_active ON public.comentarios
  FOR SELECT
  TO anon
  USING (ativo = TRUE);

CREATE POLICY comentarios_select_authenticated_visible ON public.comentarios
  FOR SELECT
  TO authenticated
  USING (
    ativo = TRUE
    OR auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spot_imagens_select_visible ON public.spot_imagens;
DROP POLICY IF EXISTS spot_imagens_select_public_active ON public.spot_imagens;
DROP POLICY IF EXISTS spot_imagens_select_authenticated_visible ON public.spot_imagens;

CREATE POLICY spot_imagens_select_public_active ON public.spot_imagens
  FOR SELECT
  TO anon
  USING (ativo = TRUE);

CREATE POLICY spot_imagens_select_authenticated_visible ON public.spot_imagens
  FOR SELECT
  TO authenticated
  USING (
    ativo = TRUE
    OR auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );
