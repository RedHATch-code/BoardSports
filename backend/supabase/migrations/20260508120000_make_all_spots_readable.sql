-- Torna todos os spots visíveis para qualquer visitante/utilizador.
-- Mantém as regras de escrita separadas: criar, editar e apagar continuam controlados por autenticação/RLS.

DROP POLICY IF EXISTS spots_select_public_approved ON public.spots;
DROP POLICY IF EXISTS spots_select_all ON public.spots;

CREATE POLICY spots_select_all ON public.spots
  FOR SELECT
  USING (true);
