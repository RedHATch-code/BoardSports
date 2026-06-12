-- Anonymous visitors must be able to read public profile fields through
-- public_profiles without executing the authenticated-only is_admin_user().

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin_user(auth.uid()));
