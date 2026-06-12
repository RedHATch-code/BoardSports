-- Keep map visibility stable after moderation deletes:
-- active spots are visible, inactive spots are hidden.
-- The frontend still performs an ativo=true filter, but RLS should match it.

DROP POLICY IF EXISTS "Spots de atletas são visíveis para seguidores" ON public.spots;
DROP POLICY IF EXISTS "Spots de clientes são privados" ON public.spots;
DROP POLICY IF EXISTS "Spots de empresas são públicos" ON public.spots;
DROP POLICY IF EXISTS "Spots públicos aprovados são visíveis" ON public.spots;
DROP POLICY IF EXISTS spots_select_all ON public.spots;
DROP POLICY IF EXISTS spots_select_public_approved ON public.spots;
DROP POLICY IF EXISTS spots_select_public_active ON public.spots;
DROP POLICY IF EXISTS spots_select_authenticated_active ON public.spots;

GRANT SELECT ON public.spots TO anon, authenticated;

CREATE POLICY spots_select_active_for_visitors ON public.spots
  FOR SELECT
  TO anon
  USING (ativo = TRUE);

CREATE POLICY spots_select_active_owner_admin ON public.spots
  FOR SELECT
  TO authenticated
  USING (
    ativo = TRUE
    OR auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  );

-- Delivery/admin demo credential requested for the admin-only login screen.
-- Auth still validates through Supabase and the frontend still checks is_admin.
UPDATE auth.users
SET
  encrypted_password = crypt('12345', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE lower(email) = 'tiagomendessss2022@gmail.com';
