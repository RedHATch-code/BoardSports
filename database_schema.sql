-- ============================================================
-- BoardSports Inc Database Schema
-- ============================================================

-- Tabela de Perfis de Utilizadores
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('empresa', 'atleta', 'cliente')),
  is_admin BOOLEAN DEFAULT FALSE,
  nome VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  foto_perfil VARCHAR(500),
  website_url VARCHAR(500),
  bio TEXT,
  localidade VARCHAR(255),
  email_verificado BOOLEAN DEFAULT FALSE,
  data_verificacao_email TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de Modalidades
CREATE TABLE IF NOT EXISTS modalidades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  imagem VARCHAR(500),
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de Produtos/Serviços
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  categoria VARCHAR(100),
  modalidade_id INT REFERENCES modalidades(id),
  imagem VARCHAR(500),
  stock INT DEFAULT 0,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de Eventos/Competições
CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  modalidade_id INT NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP NOT NULL,
  localidade VARCHAR(255),
  coordenadas_lat DECIMAL(10, 8),
  coordenadas_long DECIMAL(11, 8),
  criador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  imagem VARCHAR(500),
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de Participações em Eventos
CREATE TABLE IF NOT EXISTS participacoes_eventos (
  id SERIAL PRIMARY KEY,
  evento_id INT NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classificacao INT,
  pontos INT,
  data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmado BOOLEAN DEFAULT FALSE,
  UNIQUE(evento_id, atleta_id)
);

-- Tabela de Compras/Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_entrega TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado', 'entregue', 'cancelado')),
  valor_total DECIMAL(10, 2) NOT NULL,
  endereco_entrega TEXT,
  notas TEXT
);

-- Tabela de Items do Pedido
CREATE TABLE IF NOT EXISTS pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INT NOT NULL REFERENCES produtos(id),
  quantidade INT NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- Tabela de Avaliações/Reviews
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
  evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
  classificacao INT NOT NULL CHECK (classificacao BETWEEN 1 AND 5),
  comentario TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  util_sim INT DEFAULT 0,
  util_nao INT DEFAULT 0
);

-- Tabela de Seguimentos (Followers)
CREATE TABLE IF NOT EXISTS seguimentos (
  id SERIAL PRIMARY KEY,
  seguidor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seguido_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(seguidor_id, seguido_id),
  CHECK (seguidor_id != seguido_id)
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  remetente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lido BOOLEAN DEFAULT FALSE
);

-- Tabela de Categorias por Modalidade
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  modalidade_id INT NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  UNIQUE(modalidade_id, nome)
);

-- Tabela de Spots
CREATE TABLE IF NOT EXISTS spots (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  video_url VARCHAR(500),
  coordenadas_lat DECIMAL(10, 8) NOT NULL,
  coordenadas_long DECIMAL(11, 8) NOT NULL,
  criador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  modalidade_id INT NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  categoria_id INT REFERENCES categorias(id) ON DELETE CASCADE,
  publico BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de Solicitações de Publicação (Admin)
CREATE TABLE IF NOT EXISTS solicitacoes_publicacao (
  id SERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  mensagem_admin TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_decisao TIMESTAMP
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE solicitacoes_publicacao
  ADD COLUMN IF NOT EXISTS data_decisao TIMESTAMP;

INSERT INTO modalidades (nome, descricao, ativo) VALUES
('Surf', 'Desporto aquático de prancha com ondas', TRUE),
('Skate', 'Desporto sobre rodas com prancha', TRUE),
('Skimboard', 'Desporto aquático em águas rasas', TRUE),
('Snowboard', 'Desporto de neve sobre prancha', TRUE),
('Sandboard', 'Desporto em dunas de areia', TRUE)
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- CATEGORIAS POR MODALIDADE
-- ============================================================

-- SURF (id = 1)
INSERT INTO categorias (modalidade_id, nome, descricao) VALUES
(1, 'Shortboard', 'Manobras rápidas, aéreas'),
(1, 'Fish', 'Mais largo, bom para ondas pequenas/médias'),
(1, 'Funboard / Mini-malibu', 'Intermédio, fácil de apanhar ondas'),
(1, 'Longboard', 'Estilo clássico, nose ride'),
(1, 'Gun', 'Ondas grandes'),
(1, 'Softboard', 'Espuma, iniciante'),
(1, 'Big Wave', 'Ondas gigantes, tow-in às vezes'),
(1, 'Tow-in Surf', 'Rebocado por mota de água'),
(1, 'Bodyboard', 'Prancha curta, deitado'),
(1, 'Bodysurf', 'Sem prancha'),
(1, 'Stand Up Paddle (SUP Surf)', 'Em pé com pagaia')
ON CONFLICT (modalidade_id, nome) DO NOTHING;

-- SKATE (id = 2)
INSERT INTO categorias (modalidade_id, nome, descricao) VALUES
(2, 'Street', 'Escadas, corrimões, gaps'),
(2, 'Park', 'Skateparks, bowls pequenos, transições'),
(2, 'Vert', 'Half-pipe alto'),
(2, 'Bowl / Pool', 'Bacias/piscinas, transições fundas'),
(2, 'Freestyle', 'Manobras técnicas/planas, old school vibe'),
(2, 'Downhill', 'Alta velocidade a descer'),
(2, 'Cruising', 'Passeio'),
(2, 'Longboard – Dancing', 'Passos/coreografias na prancha'),
(2, 'Longboard – Freeride', 'Slides controlados'),
(2, 'Slalom', 'Cones, agilidade')
ON CONFLICT (modalidade_id, nome) DO NOTHING;

-- SKIMBOARD (id = 3)
INSERT INTO categorias (modalidade_id, nome, descricao) VALUES
(3, 'Flatland', 'Em água rasa, manobras no plano'),
(3, 'Wave Skimming', 'Apanhar ondas, mais parecido com surf'),
(3, 'Freestyle', 'Shuvs, spins, geralmente flat'),
(3, 'Technical / Tricks', 'Foco em manobras'),
(3, 'Cruising / Recreativo', 'Uso casual em praia rasa')
ON CONFLICT (modalidade_id, nome) DO NOTHING;

-- SNOWBOARD (id = 4)
INSERT INTO categorias (modalidade_id, nome, descricao) VALUES
(4, 'Freeride', 'Fora de pista, natural'),
(4, 'Freestyle', 'Manobras, park'),
(4, 'Park', 'Rails, boxes, kickers'),
(4, 'Jibbing', 'Slides em rails/caixas'),
(4, 'Halfpipe', 'Pipe grande'),
(4, 'Slopestyle', 'Linha com obstáculos e saltos'),
(4, 'Big Air', 'Um salto enorme'),
(4, 'Boardercross / Snowboard Cross', 'Corrida em pista com obstáculos'),
(4, 'Alpine / Carving', 'Curvas agressivas, prancha mais rígida'),
(4, 'Splitboard', 'Subida em modo ski e descida snowboard'),
(4, 'Backcountry', 'Montanha, neve natural')
ON CONFLICT (modalidade_id, nome) DO NOTHING;

-- SANDBOARD (id = 5)
INSERT INTO categorias (modalidade_id, nome, descricao) VALUES
(5, 'Freeride', 'Descer dunas, estilo livre'),
(5, 'Downhill / Speed', 'Velocidade máxima'),
(5, 'Freestyle', 'Saltos e manobras'),
(5, 'Dune Jumping', 'Foco em airs/saltos'),
(5, 'Carving', 'Curvas desenhadas, controlo'),
(5, 'Boardercross', 'Pista com obstáculos/curvas, corrida'),
(5, 'Sled / Sit-down', 'Variações sentado - mais recreativo')
ON CONFLICT (modalidade_id, nome) DO NOTHING;

-- ============================================================
-- Índices para Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON profiles(ativo);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_modalidade_id ON produtos(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_eventos_modalidade_id ON eventos(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_eventos_criador_id ON eventos(criador_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_participacoes_evento_id ON participacoes_eventos(evento_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_atleta_id ON participacoes_eventos(atleta_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_id ON pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario_id ON avaliacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_seguimentos_seguidor_id ON seguimentos(seguidor_id);
CREATE INDEX IF NOT EXISTS idx_seguimentos_seguido_id ON seguimentos(seguido_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente_id ON mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario_id ON mensagens(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_spots_criador_id ON spots(criador_id);
CREATE INDEX IF NOT EXISTS idx_spots_modalidade_id ON spots(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_spots_publico ON spots(publico);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_publicacao_status ON solicitacoes_publicacao(status);

-- ============================================================
-- FUNCOES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND is_admin = TRUE
      AND ativo = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated, anon;

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
  current_user UUID := auth.uid();
  invalid_count INT := 0;
  grouped_order RECORD;
  new_order_id INT;
  created_orders JSONB := '[]'::JSONB;
BEGIN
  IF current_user IS NULL THEN
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
  SELECT
    NULLIF(item->>'product_id', '')::INT,
    GREATEST(NULLIF(item->>'quantity', '')::INT, 0)
  FROM jsonb_array_elements(p_items) AS item;

  DELETE FROM tmp_checkout_items
  WHERE product_id IS NULL OR quantity <= 0;

  IF NOT EXISTS (SELECT 1 FROM tmp_checkout_items) THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  SELECT COUNT(*)
  INTO invalid_count
  FROM tmp_checkout_items t
  LEFT JOIN public.produtos p ON p.id = t.product_id
  WHERE p.id IS NULL
     OR COALESCE(p.ativo, FALSE) = FALSE
     OR COALESCE(p.stock, 0) < t.quantity;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
  END IF;

  FOR grouped_order IN
    SELECT
      p.empresa_id,
      ROUND(SUM(p.preco * t.quantity)::NUMERIC, 2) AS total
    FROM tmp_checkout_items t
    JOIN public.produtos p ON p.id = t.product_id
    GROUP BY p.empresa_id
  LOOP
    INSERT INTO public.pedidos (
      cliente_id,
      empresa_id,
      valor_total,
      endereco_entrega,
      notas
    )
    VALUES (
      current_user,
      grouped_order.empresa_id,
      grouped_order.total,
      NULLIF(BTRIM(p_endereco_entrega), ''),
      NULLIF(BTRIM(p_notas), '')
    )
    RETURNING id INTO new_order_id;

    INSERT INTO public.pedido_items (
      pedido_id,
      produto_id,
      quantidade,
      preco_unitario,
      subtotal
    )
    SELECT
      new_order_id,
      p.id,
      t.quantity,
      p.preco,
      ROUND((p.preco * t.quantity)::NUMERIC, 2)
    FROM tmp_checkout_items t
    JOIN public.produtos p ON p.id = t.product_id
    WHERE p.empresa_id = grouped_order.empresa_id;

    UPDATE public.produtos p
    SET
      stock = GREATEST(COALESCE(p.stock, 0) - t.quantity, 0),
      data_atualizacao = CURRENT_TIMESTAMP
    FROM tmp_checkout_items t
    WHERE p.id = t.product_id
      AND p.empresa_id = grouped_order.empresa_id;

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
  current_user UUID := auth.uid();
  normalized_status TEXT := LOWER(BTRIM(p_status));
  request_row public.solicitacoes_publicacao%ROWTYPE;
BEGIN
  IF current_user IS NULL OR NOT public.is_admin_user(current_user) THEN
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
  WHERE id = request_row.spot_id;

  RETURN jsonb_build_object(
    'solicitacao_id', request_row.id,
    'spot_id', request_row.spot_id,
    'status', normalized_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.moderar_solicitacao_publicacao(INT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- RLS (Row Level Security) - Políticas de Segurança
-- ============================================================

-- Habilitar RLS nas tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE participacoes_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_publicacao ENABLE ROW LEVEL SECURITY;

-- Política: Utilizadores podem ver perfis públicos
CREATE POLICY "Perfis públicos são visíveis" ON profiles
  FOR SELECT USING (ativo = TRUE OR auth.uid() = id);

-- Política: Utilizadores podem atualizar o seu próprio perfil
CREATE POLICY "Utilizadores podem atualizar seu perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política: Utilizadores podem inserir o seu próprio perfil (NOVO)
CREATE POLICY "Utilizadores podem inserir seu perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política: Empresas podem ver/editar seus produtos
CREATE POLICY "Empresas podem gerenciar seus produtos" ON produtos
  FOR ALL USING (auth.uid() = empresa_id);

-- Política: Todos podem ver produtos ativos
CREATE POLICY "Produtos ativos são visíveis" ON produtos
  FOR SELECT USING (ativo = TRUE);

-- Política: Todos podem ver eventos ativos
CREATE POLICY "Eventos ativos são visíveis" ON eventos
  FOR SELECT USING (ativo = TRUE);

-- Política: Utilizadores podem ver seus próprios pedidos
CREATE POLICY "Utilizadores podem ver seus pedidos" ON pedidos
  FOR SELECT USING (auth.uid() = cliente_id OR auth.uid() = empresa_id);

-- Política: Utilizadores podem ver mensagens suas
CREATE POLICY "Utilizadores podem ver suas mensagens" ON mensagens
  FOR SELECT USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id);

-- ============================================================
-- Políticas para Spots (Lógica de Visibilidade)
-- ============================================================

-- 1. Empresas: spots criados por empresas são públicos
CREATE POLICY "Spots de empresas são públicos" ON spots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = spots.criador_id AND profiles.role = 'empresa'
    )
  );

-- 2. Atletas: visíveis para o criador e para quem o segue
CREATE POLICY "Spots de atletas são visíveis para seguidores" ON spots
  FOR SELECT USING (
    auth.uid() = criador_id OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN seguimentos s ON s.seguido_id = p.id
      WHERE p.id = spots.criador_id AND p.role = 'atleta' AND s.seguidor_id = auth.uid()
    )
  );

-- 3. Clientes: visíveis apenas para o próprio criador
CREATE POLICY "Spots de clientes são privados" ON spots
  FOR SELECT USING (
    auth.uid() = criador_id AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'cliente'
    )
  );

-- 4. Público: spots aprovados pelo admin são visíveis para todos
CREATE POLICY "Spots públicos aprovados são visíveis" ON spots
  FOR SELECT USING (publico = TRUE);

-- 5. Inserção: Todos podem inserir spots
CREATE POLICY "Qualquer utilizador pode criar spots" ON spots
  FOR INSERT WITH CHECK (auth.uid() = criador_id);

-- 6. Gestão: Apenas o criador pode editar/apagar
CREATE POLICY "Criadores podem gerir seus spots" ON spots
  FOR ALL USING (auth.uid() = criador_id);

-- ============================================================
-- Políticas para Solicitações
-- ============================================================
CREATE POLICY "Utilizadores podem ver suas solicitações" ON solicitacoes_publicacao
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Utilizadores podem criar solicitações" ON solicitacoes_publicacao
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- ============================================================
-- Politicas adicionais para fluxos reais do site
-- ============================================================

DROP POLICY IF EXISTS profiles_select_visible ON profiles;
CREATE POLICY profiles_select_visible ON profiles
  FOR SELECT USING (
    ativo = TRUE
    OR auth.uid() = id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS profiles_insert_self ON profiles;
CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS profiles_update_self ON profiles;
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS produtos_select_visible ON produtos;
CREATE POLICY produtos_select_visible ON produtos
  FOR SELECT USING (
    ativo = TRUE
    OR auth.uid() = empresa_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS produtos_empresa_manage ON produtos;
CREATE POLICY produtos_empresa_manage ON produtos
  FOR ALL USING (
    auth.uid() = empresa_id
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = empresa_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS eventos_select_visible ON eventos;
CREATE POLICY eventos_select_visible ON eventos
  FOR SELECT USING (
    ativo = TRUE
    OR auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS eventos_insert_empresa ON eventos;
CREATE POLICY eventos_insert_empresa ON eventos
  FOR INSERT WITH CHECK (
    (
      auth.uid() = criador_id
      AND EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
          AND role = 'empresa'
      )
    )
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS eventos_manage_owner ON eventos;
CREATE POLICY eventos_manage_owner ON eventos
  FOR UPDATE USING (
    auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS eventos_delete_owner ON eventos;
CREATE POLICY eventos_delete_owner ON eventos
  FOR DELETE USING (
    auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS pedidos_select_related ON pedidos;
CREATE POLICY pedidos_select_related ON pedidos
  FOR SELECT USING (
    auth.uid() = cliente_id
    OR auth.uid() = empresa_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS pedidos_insert_own ON pedidos;
CREATE POLICY pedidos_insert_own ON pedidos
  FOR INSERT WITH CHECK (
    auth.uid() = cliente_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS pedidos_update_related ON pedidos;
CREATE POLICY pedidos_update_related ON pedidos
  FOR UPDATE USING (
    auth.uid() = cliente_id
    OR auth.uid() = empresa_id
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = cliente_id
    OR auth.uid() = empresa_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS pedido_items_select_related ON pedido_items;
CREATE POLICY pedido_items_select_related ON pedido_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM pedidos
      WHERE pedidos.id = pedido_items.pedido_id
        AND (
          pedidos.cliente_id = auth.uid()
          OR pedidos.empresa_id = auth.uid()
          OR public.is_admin_user(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS pedido_items_insert_related ON pedido_items;
CREATE POLICY pedido_items_insert_related ON pedido_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM pedidos
      WHERE pedidos.id = pedido_id
        AND (
          pedidos.cliente_id = auth.uid()
          OR public.is_admin_user(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS participacoes_select_related ON participacoes_eventos;
CREATE POLICY participacoes_select_related ON participacoes_eventos
  FOR SELECT USING (
    atleta_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM eventos
      WHERE eventos.id = participacoes_eventos.evento_id
        AND (
          eventos.criador_id = auth.uid()
          OR public.is_admin_user(auth.uid())
        )
    )
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS participacoes_insert_own ON participacoes_eventos;
CREATE POLICY participacoes_insert_own ON participacoes_eventos
  FOR INSERT WITH CHECK (
    atleta_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS participacoes_delete_own ON participacoes_eventos;
CREATE POLICY participacoes_delete_own ON participacoes_eventos
  FOR DELETE USING (
    atleta_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS avaliacoes_select_public ON avaliacoes;
CREATE POLICY avaliacoes_select_public ON avaliacoes
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS avaliacoes_insert_own ON avaliacoes;
CREATE POLICY avaliacoes_insert_own ON avaliacoes
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS avaliacoes_update_own ON avaliacoes;
CREATE POLICY avaliacoes_update_own ON avaliacoes
  FOR UPDATE USING (
    usuario_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS avaliacoes_delete_own ON avaliacoes;
CREATE POLICY avaliacoes_delete_own ON avaliacoes
  FOR DELETE USING (
    usuario_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS mensagens_select_related ON mensagens;
CREATE POLICY mensagens_select_related ON mensagens
  FOR SELECT USING (
    auth.uid() = remetente_id
    OR auth.uid() = destinatario_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spots_select_public_approved ON spots;
CREATE POLICY spots_select_public_approved ON spots
  FOR SELECT USING (
    publico = TRUE
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spots_manage_own ON spots;
CREATE POLICY spots_manage_own ON spots
  FOR ALL USING (
    auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = criador_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS solicitacoes_select_own_or_admin ON solicitacoes_publicacao;
CREATE POLICY solicitacoes_select_own_or_admin ON solicitacoes_publicacao
  FOR SELECT USING (
    auth.uid() = usuario_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS solicitacoes_insert_own ON solicitacoes_publicacao;
CREATE POLICY solicitacoes_insert_own ON solicitacoes_publicacao
  FOR INSERT WITH CHECK (
    auth.uid() = usuario_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS solicitacoes_update_admin ON solicitacoes_publicacao;
CREATE POLICY solicitacoes_update_admin ON solicitacoes_publicacao
  FOR UPDATE USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ============================================================
-- Fim do Script
-- ============================================================

-- ============================================================
-- Storage: Avatares de Perfil
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatares publicos" ON storage.objects;
CREATE POLICY "Avatares publicos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Utilizadores podem enviar avatar" ON storage.objects;
CREATE POLICY "Utilizadores podem enviar avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Utilizadores podem atualizar avatar" ON storage.objects;
CREATE POLICY "Utilizadores podem atualizar avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Utilizadores podem apagar avatar" ON storage.objects;
CREATE POLICY "Utilizadores podem apagar avatar" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
