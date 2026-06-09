-- Store the best season/months to visit water and snow spots.

ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS melhor_epoca_meses INT[] DEFAULT ARRAY[]::INT[],
  ADD COLUMN IF NOT EXISTS melhor_epoca_notas TEXT;

ALTER TABLE public.spots
  DROP CONSTRAINT IF EXISTS spots_melhor_epoca_meses_check;

ALTER TABLE public.spots
  ADD CONSTRAINT spots_melhor_epoca_meses_check
  CHECK (
    melhor_epoca_meses IS NULL
    OR (
      array_length(melhor_epoca_meses, 1) IS NULL
      OR (
        1 <= ALL (melhor_epoca_meses)
        AND 12 >= ALL (melhor_epoca_meses)
      )
    )
  );
