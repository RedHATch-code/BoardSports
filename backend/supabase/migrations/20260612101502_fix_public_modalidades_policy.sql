-- The public frontend reads active sports through the anon role.
-- is_admin_user() is intentionally not executable by anon, so public SELECT
-- policies must not call it.
DROP POLICY IF EXISTS modalidades_select_active ON public.modalidades;
CREATE POLICY modalidades_select_active ON public.modalidades
  FOR SELECT
  USING (ativo = TRUE);
