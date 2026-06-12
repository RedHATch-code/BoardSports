-- Remove legacy public SELECT policies that call is_admin_user() as anon.
-- Public visitors only need active comments/images; authenticated users keep
-- owner/admin visibility through the newer authenticated policies.

DROP POLICY IF EXISTS comentarios_select_public ON public.comentarios;
DROP POLICY IF EXISTS spot_imagens_select_public ON public.spot_imagens;
