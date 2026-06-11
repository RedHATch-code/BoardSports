-- Internal admin helper must not be callable by anonymous browser sessions.
REVOKE ALL ON FUNCTION public.is_admin_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;
