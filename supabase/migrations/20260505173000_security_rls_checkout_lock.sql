-- ============================================================
-- Security hardening: RLS guarantees and checkout stock locking.
-- ============================================================

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categorias_select_public ON public.categorias;
CREATE POLICY categorias_select_public ON public.categorias
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS seguimentos_select_related ON public.seguimentos;
CREATE POLICY seguimentos_select_related ON public.seguimentos
  FOR SELECT USING (
    seguidor_id = auth.uid()
    OR seguido_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS seguimentos_insert_own ON public.seguimentos;
CREATE POLICY seguimentos_insert_own ON public.seguimentos
  FOR INSERT WITH CHECK (
    seguidor_id = auth.uid()
    AND seguidor_id <> seguido_id
  );

DROP POLICY IF EXISTS seguimentos_delete_own ON public.seguimentos;
CREATE POLICY seguimentos_delete_own ON public.seguimentos
  FOR DELETE USING (
    seguidor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.processar_checkout(
  p_items JSONB,
  p_endereco_entrega TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  invalid_count INT := 0;
  grouped_order RECORD;
  new_order_id INT;
  created_orders JSONB := '[]'::JSONB;
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  CREATE TEMP TABLE tmp_checkout_items (
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0)
  ) ON COMMIT DROP;

  INSERT INTO tmp_checkout_items (product_id, quantity)
  SELECT product_id, SUM(quantity)::INT
  FROM (
    SELECT
      NULLIF(item->>'product_id', '')::INT AS product_id,
      GREATEST(NULLIF(item->>'quantity', '')::INT, 0) AS quantity
    FROM jsonb_array_elements(p_items) AS item
  ) parsed
  WHERE product_id IS NOT NULL
    AND quantity > 0
  GROUP BY product_id;

  IF NOT EXISTS (SELECT 1 FROM tmp_checkout_items) THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  CREATE TEMP TABLE tmp_locked_products AS
  SELECT p.*
  FROM public.produtos p
  JOIN tmp_checkout_items t ON t.product_id = p.id
  ORDER BY p.id
  FOR UPDATE OF p;

  SELECT COUNT(*)
  INTO invalid_count
  FROM tmp_checkout_items t
  LEFT JOIN tmp_locked_products p ON p.id = t.product_id
  WHERE p.id IS NULL
     OR COALESCE(p.ativo, FALSE) = FALSE
     OR COALESCE(p.stock, 0) < t.quantity;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
  END IF;

  FOR grouped_order IN
    SELECT p.empresa_id, ROUND(SUM(p.preco * t.quantity)::NUMERIC, 2) AS total
    FROM tmp_checkout_items t
    JOIN tmp_locked_products p ON p.id = t.product_id
    GROUP BY p.empresa_id
  LOOP
    INSERT INTO public.pedidos (cliente_id, empresa_id, valor_total, endereco_entrega, notas)
    VALUES (
      v_current_user,
      grouped_order.empresa_id,
      grouped_order.total,
      NULLIF(BTRIM(p_endereco_entrega), ''),
      NULLIF(BTRIM(p_notas), '')
    )
    RETURNING id INTO new_order_id;

    INSERT INTO public.pedido_items (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
    SELECT new_order_id, p.id, t.quantity, p.preco, ROUND((p.preco * t.quantity)::NUMERIC, 2)
    FROM tmp_checkout_items t
    JOIN tmp_locked_products p ON p.id = t.product_id
    WHERE p.empresa_id = grouped_order.empresa_id;

    UPDATE public.produtos p
    SET stock = p.stock - t.quantity,
        data_atualizacao = CURRENT_TIMESTAMP
    FROM tmp_checkout_items t
    JOIN tmp_locked_products locked ON locked.id = t.product_id
    WHERE p.id = t.product_id
      AND locked.empresa_id = grouped_order.empresa_id
      AND p.stock >= t.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    created_orders := created_orders || jsonb_build_array(
      jsonb_build_object(
        'pedido_id', new_order_id,
        'empresa_id', grouped_order.empresa_id,
        'valor_total', grouped_order.total
      )
    );
  END LOOP;

  RETURN jsonb_build_object('orders', created_orders);
END;
$$;

GRANT EXECUTE ON FUNCTION public.processar_checkout(JSONB, TEXT, TEXT) TO authenticated;
