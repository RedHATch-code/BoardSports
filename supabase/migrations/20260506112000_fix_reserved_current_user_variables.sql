-- Fix reserved PostgreSQL current_user collisions in SECURITY DEFINER functions.
-- current_user is a built-in expression of type name, so local variables must not use that identifier.

CREATE OR REPLACE FUNCTION public.moderar_submissao_xp(
  p_submissao_id INT,
  p_estado TEXT,
  p_motivo_rejeicao TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  normalized_estado TEXT := LOWER(BTRIM(p_estado));
  item public.submissoes%ROWTYPE;
  origem_log TEXT;
BEGIN
  IF v_current_user IS NULL OR NOT public.is_admin_user(v_current_user) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF normalized_estado NOT IN ('validado', 'rejeitado') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT *
  INTO item
  FROM public.submissoes
  WHERE id = p_submissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBMISSAO_NOT_FOUND';
  END IF;

  IF item.estado <> 'pendente' THEN
    RAISE EXCEPTION 'SUBMISSAO_ALREADY_MODERATED';
  END IF;

  IF normalized_estado = 'rejeitado' THEN
    UPDATE public.submissoes
    SET
      estado = 'rejeitado',
      motivo_rejeicao = NULLIF(BTRIM(p_motivo_rejeicao), ''),
      xp_atribuido = 0,
      validado_por = v_current_user,
      data_validacao = CURRENT_TIMESTAMP
    WHERE id = item.id;

    RETURN jsonb_build_object('submissao_id', item.id, 'estado', 'rejeitado', 'xp_atribuido', 0);
  END IF;

  IF item.distancia_spot_metros IS NOT NULL AND item.distancia_spot_metros > 100 THEN
    RAISE EXCEPTION 'SUBMISSAO_FORA_DO_SPOT';
  END IF;

  origem_log := CASE item.tipo
    WHEN 'spot' THEN 'spot'
    WHEN 'manobra' THEN 'manobra'
    WHEN 'combo' THEN 'combo'
    ELSE 'admin'
  END;

  UPDATE public.submissoes
  SET
    estado = 'validado',
    motivo_rejeicao = NULL,
    xp_atribuido = COALESCE(item.xp_previsto, 0),
    validado_por = v_current_user,
    data_validacao = CURRENT_TIMESTAMP
  WHERE id = item.id;

  IF item.combo_id IS NOT NULL THEN
    UPDATE public.combos
    SET estado = 'validado', xp_total = COALESCE(item.xp_previsto, 0)
    WHERE id = item.combo_id;
  END IF;

  INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
  VALUES (
    item.user_id,
    origem_log,
    item.id,
    COALESCE(item.xp_previsto, 0),
    CONCAT('Submissao ', item.tipo, ' validada pela moderacao')
  );

  PERFORM public.bs_recalcular_perfil_xp(item.user_id);

  RETURN jsonb_build_object(
    'submissao_id', item.id,
    'estado', 'validado',
    'xp_atribuido', COALESCE(item.xp_previsto, 0)
  );
END;
$$;

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
    p.email,
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
  WHERE COALESCE(sp.modalidade_id, m.modalidade_id) = p_modalidade_id
  GROUP BY p.id, p.nome, p.email, p.foto_perfil, p.xp_total, p.nivel_xp, p.tipo_user
  ORDER BY xp_ranking DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.reclamar_conquista_diaria(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  normalized_code TEXT := LOWER(BTRIM(COALESCE(p_codigo, '')));
  today DATE := CURRENT_DATE;
  xp_value INT := 0;
  achievement_label TEXT := '';
  evidence_count INT := 0;
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF normalized_code = 'checkin_diario' THEN
    xp_value := 20;
    achievement_label := 'Check-in diario';
    evidence_count := 1;
  ELSIF normalized_code = 'spot_diario' THEN
    xp_value := 60;
    achievement_label := 'Spot do dia';

    SELECT COUNT(*)
    INTO evidence_count
    FROM public.spots
    WHERE criador_id = v_current_user
      AND data_criacao::date = today;
  ELSIF normalized_code = 'video_diario' THEN
    xp_value := 40;
    achievement_label := 'Video do dia';

    SELECT COUNT(*)
    INTO evidence_count
    FROM public.spot_videos
    WHERE autor_id = v_current_user
      AND data_criacao::date = today
      AND ativo = TRUE;
  ELSE
    RAISE EXCEPTION 'INVALID_DAILY_ACHIEVEMENT';
  END IF;

  IF evidence_count <= 0 THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', normalized_code,
      'erro', 'Conquista ainda nao concluida hoje.'
    );
  END IF;

  INSERT INTO public.conquistas_diarias (user_id, codigo, data_conquista, xp_ganho, descricao)
  VALUES (v_current_user, normalized_code, today, xp_value, achievement_label)
  ON CONFLICT (user_id, codigo, data_conquista) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', normalized_code,
      'erro', 'Esta conquista diaria ja foi reclamada hoje.'
    );
  END IF;

  INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
  VALUES (
    v_current_user,
    'badge',
    NULL,
    xp_value,
    CONCAT(achievement_label, ' - conquista diaria')
  );

  PERFORM public.bs_recalcular_perfil_xp(v_current_user);

  RETURN jsonb_build_object(
    'sucesso', true,
    'codigo', normalized_code,
    'xp_ganho', xp_value,
    'descricao', achievement_label
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bs_award_spot_video_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spot_author UUID;
BEGIN
  IF COALESCE(NEW.ativo, TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  IF NEW.autor_id IS NOT NULL THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      NEW.autor_id,
      'video',
      NEW.id,
      40,
      'Video publicado num spot'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = NEW.autor_id
        AND origem = 'video'
        AND referencia_id = NEW.id
        AND descricao = 'Video publicado num spot'
    );
  END IF;

  SELECT criador_id
  INTO spot_author
  FROM public.spots
  WHERE id = NEW.spot_id;

  IF spot_author IS NOT NULL THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      spot_author,
      'spot',
      NEW.spot_id,
      60,
      'Spot com video publicado'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = spot_author
        AND origem = 'spot'
        AND referencia_id = NEW.spot_id
        AND descricao = 'Spot com video publicado'
    );
  END IF;

  IF NEW.autor_id IS NOT NULL THEN
    PERFORM public.bs_recalcular_perfil_xp(NEW.autor_id);
  END IF;

  IF spot_author IS NOT NULL AND spot_author IS DISTINCT FROM NEW.autor_id THEN
    PERFORM public.bs_recalcular_perfil_xp(spot_author);
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bs_nivel_por_xp(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bs_tipo_por_nivel(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bs_recalcular_perfil_xp(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderar_submissao_xp(INT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.reclamar_conquista_diaria(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  normalized_code TEXT := LOWER(BTRIM(COALESCE(p_codigo, '')));
  today DATE := CURRENT_DATE;
  xp_value INT := 0;
  achievement_label TEXT := '';
  evidence_count INT := 0;
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF normalized_code = 'checkin_diario' THEN
    xp_value := 20;
    achievement_label := 'Check-in diario';
    evidence_count := 1;
  ELSIF normalized_code = 'spot_diario' THEN
    xp_value := 60;
    achievement_label := 'Spot do dia';

    SELECT COUNT(*)
    INTO evidence_count
    FROM public.spots
    WHERE criador_id = v_current_user
      AND data_criacao::date = today;
  ELSIF normalized_code = 'video_diario' THEN
    xp_value := 40;
    achievement_label := 'Video do dia';

    SELECT COUNT(*)
    INTO evidence_count
    FROM public.spot_videos
    WHERE autor_id = v_current_user
      AND data_criacao::date = today
      AND ativo = TRUE;
  ELSE
    RAISE EXCEPTION 'INVALID_DAILY_ACHIEVEMENT';
  END IF;

  IF evidence_count <= 0 THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', normalized_code,
      'erro', 'Conquista ainda nao concluida hoje.'
    );
  END IF;

  INSERT INTO public.conquistas_diarias (user_id, codigo, data_conquista, xp_ganho, descricao)
  VALUES (v_current_user, normalized_code, today, xp_value, achievement_label)
  ON CONFLICT (user_id, codigo, data_conquista) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', normalized_code,
      'erro', 'Esta conquista diaria ja foi reclamada hoje.'
    );
  END IF;

  INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
  VALUES (
    v_current_user,
    'badge',
    NULL,
    xp_value,
    CONCAT(achievement_label, ' - conquista diaria')
  );

  PERFORM public.bs_recalcular_perfil_xp(v_current_user);

  RETURN jsonb_build_object(
    'sucesso', true,
    'codigo', normalized_code,
    'xp_ganho', xp_value,
    'descricao', achievement_label
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bs_award_spot_video_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spot_author UUID;
BEGIN
  IF COALESCE(NEW.ativo, TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  IF NEW.autor_id IS NOT NULL THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      NEW.autor_id,
      'video',
      NEW.id,
      40,
      'Video publicado num spot'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = NEW.autor_id
        AND origem = 'video'
        AND referencia_id = NEW.id
        AND descricao = 'Video publicado num spot'
    );
  END IF;

  SELECT criador_id
  INTO spot_author
  FROM public.spots
  WHERE id = NEW.spot_id;

  IF spot_author IS NOT NULL THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      spot_author,
      'spot',
      NEW.spot_id,
      60,
      'Spot com video publicado'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = spot_author
        AND origem = 'spot'
        AND referencia_id = NEW.spot_id
        AND descricao = 'Spot com video publicado'
    );
  END IF;

  IF NEW.autor_id IS NOT NULL THEN
    PERFORM public.bs_recalcular_perfil_xp(NEW.autor_id);
  END IF;

  IF spot_author IS NOT NULL AND spot_author IS DISTINCT FROM NEW.autor_id THEN
    PERFORM public.bs_recalcular_perfil_xp(spot_author);
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bs_nivel_por_xp(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bs_tipo_por_nivel(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bs_recalcular_perfil_xp(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderar_submissao_xp(INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_por_desporto(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_conquista_diaria(TEXT) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.moderar_solicitacao_publicacao(
  p_solicitacao_id INT,
  p_status TEXT,
  p_mensagem_admin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  normalized_status TEXT := LOWER(BTRIM(p_status));
  request_row public.solicitacoes_publicacao%ROWTYPE;
  spot_author UUID;
BEGIN
  IF v_current_user IS NULL OR NOT public.is_admin_user(v_current_user) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF normalized_status NOT IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT *
  INTO request_row
  FROM public.solicitacoes_publicacao
  WHERE id = p_solicitacao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  UPDATE public.solicitacoes_publicacao
  SET
    status = normalized_status,
    mensagem_admin = NULLIF(BTRIM(p_mensagem_admin), ''),
    data_decisao = CURRENT_TIMESTAMP
  WHERE id = p_solicitacao_id;

  UPDATE public.spots
  SET
    publico = (normalized_status = 'aprovado'),
    data_atualizacao = CURRENT_TIMESTAMP
  WHERE id = request_row.spot_id
  RETURNING criador_id INTO spot_author;

  IF normalized_status = 'aprovado' AND spot_author IS NOT NULL THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      spot_author,
      'spot',
      request_row.spot_id,
      100,
      'Novo spot aprovado pela moderacao'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = spot_author
        AND origem = 'spot'
        AND referencia_id = request_row.spot_id
        AND descricao = 'Novo spot aprovado pela moderacao'
    );

    PERFORM public.bs_recalcular_perfil_xp(spot_author);
  END IF;

  RETURN jsonb_build_object(
    'solicitacao_id', request_row.id,
    'spot_id', request_row.spot_id,
    'status', normalized_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.moderar_solicitacao_publicacao(INT, TEXT, TEXT) TO authenticated;
