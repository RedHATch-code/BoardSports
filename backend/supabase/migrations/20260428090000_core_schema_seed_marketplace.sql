-- ============================================================
-- BoardSports core schema, seed data, marketplace and RLS
-- Idempotent migration for local resets and the active Supabase project.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'atleta' CHECK (role IN ('empresa', 'atleta', 'cliente')),
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

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'atleta',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(500),
  ADD COLUMN IF NOT EXISTS website_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS localidade VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_verificacao_email TIMESTAMP,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

UPDATE public.profiles
SET
  role = COALESCE(NULLIF(role, ''), 'atleta'),
  is_admin = COALESCE(is_admin, FALSE),
  ativo = COALESCE(ativo, TRUE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('empresa', 'atleta', 'cliente'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.modalidades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  imagem VARCHAR(500),
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.modalidades
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS imagem VARCHAR(500),
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.categorias (
  id SERIAL PRIMARY KEY,
  modalidade_id INT NOT NULL REFERENCES public.modalidades(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  UNIQUE (modalidade_id, nome)
);

CREATE TABLE IF NOT EXISTS public.spots (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  video_url VARCHAR(500),
  coordenadas_lat DECIMAL(10, 8) NOT NULL,
  coordenadas_long DECIMAL(11, 8) NOT NULL,
  criador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  modalidade_id INT NOT NULL REFERENCES public.modalidades(id) ON DELETE CASCADE,
  categoria_id INT REFERENCES public.categorias(id) ON DELETE SET NULL,
  dificuldade VARCHAR(20) DEFAULT 'facil',
  publico BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS video_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS categoria_id INT REFERENCES public.categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dificuldade VARCHAR(20) DEFAULT 'facil',
  ADD COLUMN IF NOT EXISTS publico BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

UPDATE public.spots
SET dificuldade = COALESCE(NULLIF(dificuldade, ''), 'facil');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spots_dificuldade_check'
  ) THEN
    ALTER TABLE public.spots
      ADD CONSTRAINT spots_dificuldade_check CHECK (dificuldade IN ('facil', 'media', 'dificil'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.spot_videos (
  id SERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url VARCHAR(500) NOT NULL,
  legenda TEXT,
  formato VARCHAR(20) DEFAULT 'long',
  plataforma VARCHAR(40),
  analise_score INT DEFAULT 0,
  analise_resultado JSONB DEFAULT '{}'::jsonb,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.spot_videos
  ADD COLUMN IF NOT EXISTS legenda TEXT,
  ADD COLUMN IF NOT EXISTS formato VARCHAR(20) DEFAULT 'long',
  ADD COLUMN IF NOT EXISTS plataforma VARCHAR(40),
  ADD COLUMN IF NOT EXISTS analise_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analise_resultado JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

UPDATE public.spot_videos
SET
  formato = COALESCE(NULLIF(formato, ''), 'long'),
  analise_score = COALESCE(analise_score, 0),
  analise_resultado = COALESCE(analise_resultado, '{}'::jsonb);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spot_videos_formato_check'
  ) THEN
    ALTER TABLE public.spot_videos
      ADD CONSTRAINT spot_videos_formato_check CHECK (formato IN ('short', 'long'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spot_videos_analise_score_check'
  ) THEN
    ALTER TABLE public.spot_videos
      ADD CONSTRAINT spot_videos_analise_score_check CHECK (analise_score BETWEEN 0 AND 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.produtos (
  id SERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL CHECK (preco >= 0),
  categoria VARCHAR(100),
  modalidade_id INT REFERENCES public.modalidades(id) ON DELETE SET NULL,
  imagem VARCHAR(500),
  stock INT DEFAULT 0 CHECK (stock >= 0),
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.eventos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  modalidade_id INT NOT NULL REFERENCES public.modalidades(id) ON DELETE CASCADE,
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP NOT NULL,
  localidade VARCHAR(255),
  coordenadas_lat DECIMAL(10, 8),
  coordenadas_long DECIMAL(11, 8),
  criador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  imagem VARCHAR(500),
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.participacoes_eventos (
  id SERIAL PRIMARY KEY,
  evento_id INT NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classificacao INT,
  pontos INT,
  data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmado BOOLEAN DEFAULT FALSE,
  UNIQUE (evento_id, atleta_id)
);

CREATE TABLE IF NOT EXISTS public.pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_entrega TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado', 'entregue', 'cancelado')),
  valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total >= 0),
  endereco_entrega TEXT,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS public.pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INT NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id INT NOT NULL REFERENCES public.produtos(id),
  quantidade INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario DECIMAL(10, 2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  produto_id INT REFERENCES public.produtos(id) ON DELETE CASCADE,
  evento_id INT REFERENCES public.eventos(id) ON DELETE CASCADE,
  classificacao INT NOT NULL CHECK (classificacao BETWEEN 1 AND 5),
  comentario TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  util_sim INT DEFAULT 0,
  util_nao INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.seguimentos (
  id SERIAL PRIMARY KEY,
  seguidor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seguido_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (seguidor_id, seguido_id),
  CHECK (seguidor_id <> seguido_id)
);

CREATE TABLE IF NOT EXISTS public.mensagens (
  id SERIAL PRIMARY KEY,
  remetente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lido BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.solicitacoes_publicacao (
  id SERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  mensagem_admin TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_decisao TIMESTAMP
);

-- Base data
INSERT INTO public.modalidades (nome, descricao, ativo) VALUES
('Surf', 'Desporto aquatico de prancha com ondas', TRUE),
('Skate', 'Desporto sobre rodas com prancha', TRUE),
('Skimboard', 'Desporto aquatico em aguas rasas', TRUE),
('Snowboard', 'Desporto de neve sobre prancha', TRUE),
('Sandboard', 'Desporto em dunas de areia', TRUE)
ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

INSERT INTO public.categorias (modalidade_id, nome, descricao) VALUES
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Shortboard', 'Manobras rapidas e aereas'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Fish', 'Prancha larga para ondas pequenas ou medias'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Funboard / Mini-malibu', 'Intermedio e facil de apanhar ondas'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Longboard', 'Estilo classico e nose ride'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Gun', 'Ondas grandes'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Softboard', 'Espuma para iniciantes'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Big Wave', 'Ondas gigantes e tow-in quando necessario'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Tow-in Surf', 'Rebocado por mota de agua'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Bodyboard', 'Prancha curta em posicao deitada'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Bodysurf', 'Sem prancha'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Stand Up Paddle (SUP Surf)', 'Em pe com pagaia'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Street', 'Escadas, corrimoes e gaps'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Park', 'Skateparks, bowls pequenos e transicoes'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Vert', 'Half-pipe alto'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Bowl / Pool', 'Bacias e transicoes fundas'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Freestyle', 'Manobras tecnicas e planas'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Downhill', 'Alta velocidade a descer'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Cruising', 'Passeio'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Longboard - Dancing', 'Passos e coreografias na prancha'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Longboard - Freeride', 'Slides controlados'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Slalom', 'Cones e agilidade'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Flatland', 'Agua rasa e manobras no plano'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Wave Skimming', 'Apanhar ondas perto da margem'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Freestyle', 'Shuvs e spins em flat'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Technical / Tricks', 'Foco em manobras'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Cruising / Recreativo', 'Uso casual em praia rasa'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Freeride', 'Fora de pista e terreno natural'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Freestyle', 'Manobras e park'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Park', 'Rails, boxes e kickers'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Jibbing', 'Slides em rails ou caixas'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Halfpipe', 'Pipe grande'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Slopestyle', 'Linha com obstaculos e saltos'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Big Air', 'Um salto grande'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Boardercross / Snowboard Cross', 'Corrida em pista com obstaculos'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Alpine / Carving', 'Curvas agressivas'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Splitboard', 'Subida em modo ski e descida snowboard'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Backcountry', 'Montanha e neve natural'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Freeride', 'Descer dunas em estilo livre'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Downhill / Speed', 'Velocidade maxima'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Freestyle', 'Saltos e manobras'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Dune Jumping', 'Foco em airs e saltos'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Carving', 'Curvas desenhadas e controlo'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Boardercross', 'Pista com obstaculos e corrida'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Sled / Sit-down', 'Variacoes sentado')
ON CONFLICT (modalidade_id, nome) DO UPDATE SET descricao = EXCLUDED.descricao;

-- Test admin for the active PAP project.
UPDATE public.profiles
SET is_admin = TRUE, ativo = TRUE
WHERE LOWER(email) = 'tiagomendessss2022@gmail.com';

-- Public starter spots keep the anonymous map useful and avoid an empty first run.
WITH seed_owner AS (
  SELECT id
  FROM public.profiles
  WHERE LOWER(email) = 'tiagomendessss2022@gmail.com'
  UNION ALL
  SELECT id
  FROM public.profiles
  WHERE ativo = TRUE
  LIMIT 1
),
seed_spots AS (
  SELECT * FROM (VALUES
    ('Praia de Matosinhos', 'Spot de surf urbano com acesso facil e ondas consistentes.', 'Surf', 'Shortboard', 'media', 41.175650::DECIMAL, -8.691020::DECIMAL),
    ('Parque das Geracoes', 'Skatepark de referencia com bowl, street e zonas tecnicas.', 'Skate', 'Park', 'media', 38.707180::DECIMAL, -9.400180::DECIMAL),
    ('Praia da Aguda', 'Zona classica para skimboard em mare baixa.', 'Skimboard', 'Flatland', 'facil', 41.049950::DECIMAL, -8.654520::DECIMAL)
  ) AS item(nome, descricao, modalidade, categoria, dificuldade, lat, lng)
)
INSERT INTO public.spots (
  nome,
  descricao,
  modalidade_id,
  categoria_id,
  dificuldade,
  coordenadas_lat,
  coordenadas_long,
  criador_id,
  publico,
  ativo
)
SELECT
  seed_spots.nome,
  seed_spots.descricao,
  modalidades.id,
  categorias.id,
  seed_spots.dificuldade,
  seed_spots.lat,
  seed_spots.lng,
  seed_owner.id,
  TRUE,
  TRUE
FROM seed_spots
CROSS JOIN seed_owner
JOIN public.modalidades ON modalidades.nome = seed_spots.modalidade
LEFT JOIN public.categorias
  ON categorias.modalidade_id = modalidades.id
 AND categorias.nome = seed_spots.categoria
WHERE seed_owner.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.spots existing
    WHERE LOWER(existing.nome) = LOWER(seed_spots.nome)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_modalidades_ativo ON public.modalidades(ativo);
CREATE INDEX IF NOT EXISTS idx_categorias_modalidade_id ON public.categorias(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_modalidade_id ON public.produtos(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_eventos_modalidade_id ON public.eventos(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_eventos_criador_id ON public.eventos(criador_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON public.eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_participacoes_evento_id ON public.participacoes_eventos(evento_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_atleta_id ON public.participacoes_eventos(atleta_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_id ON public.pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON public.pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario_id ON public.avaliacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_seguimentos_seguidor_id ON public.seguimentos(seguidor_id);
CREATE INDEX IF NOT EXISTS idx_seguimentos_seguido_id ON public.seguimentos(seguido_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente_id ON public.mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario_id ON public.mensagens(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_spots_criador_id ON public.spots(criador_id);
CREATE INDEX IF NOT EXISTS idx_spots_modalidade_id ON public.spots(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_spots_publico ON public.spots(publico);
CREATE INDEX IF NOT EXISTS idx_spot_videos_spot_id ON public.spot_videos(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_videos_autor_id ON public.spot_videos(autor_id);
CREATE INDEX IF NOT EXISTS idx_spot_videos_ativo ON public.spot_videos(ativo);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_publicacao_status ON public.solicitacoes_publicacao(status);

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
    SELECT p.empresa_id, ROUND(SUM(p.preco * t.quantity)::NUMERIC, 2) AS total
    FROM tmp_checkout_items t
    JOIN public.produtos p ON p.id = t.product_id
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
    JOIN public.produtos p ON p.id = t.product_id
    WHERE p.empresa_id = grouped_order.empresa_id;

    UPDATE public.produtos p
    SET stock = GREATEST(COALESCE(p.stock, 0) - t.quantity, 0),
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
  v_current_user UUID := auth.uid();
  normalized_status TEXT := LOWER(BTRIM(p_status));
  request_row public.solicitacoes_publicacao%ROWTYPE;
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
  SET status = normalized_status,
      mensagem_admin = NULLIF(BTRIM(p_mensagem_admin), ''),
      data_decisao = CURRENT_TIMESTAMP
  WHERE id = p_solicitacao_id;

  UPDATE public.spots
  SET publico = (normalized_status = 'aprovado'),
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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participacoes_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_publicacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS modalidades_select_active ON public.modalidades;
CREATE POLICY modalidades_select_active ON public.modalidades
  FOR SELECT USING (ativo = TRUE OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS categorias_select_public ON public.categorias;
CREATE POLICY categorias_select_public ON public.categorias
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS profiles_select_visible ON public.profiles;
CREATE POLICY profiles_select_visible ON public.profiles
  FOR SELECT USING (ativo = TRUE OR auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS produtos_select_visible ON public.produtos;
CREATE POLICY produtos_select_visible ON public.produtos
  FOR SELECT USING (ativo = TRUE OR auth.uid() = empresa_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS produtos_empresa_manage ON public.produtos;
CREATE POLICY produtos_empresa_manage ON public.produtos
  FOR ALL USING (auth.uid() = empresa_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = empresa_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS eventos_select_visible ON public.eventos;
CREATE POLICY eventos_select_visible ON public.eventos
  FOR SELECT USING (ativo = TRUE OR auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS eventos_insert_empresa ON public.eventos;
CREATE POLICY eventos_insert_empresa ON public.eventos
  FOR INSERT WITH CHECK (
    (
      auth.uid() = criador_id
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('empresa', 'atleta')
      )
    )
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS eventos_manage_owner ON public.eventos;
CREATE POLICY eventos_manage_owner ON public.eventos
  FOR UPDATE USING (auth.uid() = criador_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS eventos_delete_owner ON public.eventos;
CREATE POLICY eventos_delete_owner ON public.eventos
  FOR DELETE USING (auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS participacoes_select_related ON public.participacoes_eventos;
CREATE POLICY participacoes_select_related ON public.participacoes_eventos
  FOR SELECT USING (
    atleta_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.eventos
      WHERE eventos.id = participacoes_eventos.evento_id
        AND eventos.criador_id = auth.uid()
    )
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS participacoes_insert_own ON public.participacoes_eventos;
CREATE POLICY participacoes_insert_own ON public.participacoes_eventos
  FOR INSERT WITH CHECK (atleta_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS participacoes_update_owner ON public.participacoes_eventos;
CREATE POLICY participacoes_update_owner ON public.participacoes_eventos
  FOR UPDATE USING (
    public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.eventos
      WHERE eventos.id = participacoes_eventos.evento_id
        AND eventos.criador_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.eventos
      WHERE eventos.id = participacoes_eventos.evento_id
        AND eventos.criador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS participacoes_delete_own ON public.participacoes_eventos;
CREATE POLICY participacoes_delete_own ON public.participacoes_eventos
  FOR DELETE USING (atleta_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS pedidos_select_related ON public.pedidos;
CREATE POLICY pedidos_select_related ON public.pedidos
  FOR SELECT USING (auth.uid() = cliente_id OR auth.uid() = empresa_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS pedidos_insert_own ON public.pedidos;
CREATE POLICY pedidos_insert_own ON public.pedidos
  FOR INSERT WITH CHECK (auth.uid() = cliente_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS pedidos_update_related ON public.pedidos;
CREATE POLICY pedidos_update_related ON public.pedidos
  FOR UPDATE USING (auth.uid() = cliente_id OR auth.uid() = empresa_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = cliente_id OR auth.uid() = empresa_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS pedido_items_select_related ON public.pedido_items;
CREATE POLICY pedido_items_select_related ON public.pedido_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = pedido_items.pedido_id
        AND (
          pedidos.cliente_id = auth.uid()
          OR pedidos.empresa_id = auth.uid()
          OR public.is_admin_user(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS pedido_items_insert_related ON public.pedido_items;
CREATE POLICY pedido_items_insert_related ON public.pedido_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = pedido_id
        AND (pedidos.cliente_id = auth.uid() OR public.is_admin_user(auth.uid()))
    )
  );

DROP POLICY IF EXISTS avaliacoes_select_public ON public.avaliacoes;
CREATE POLICY avaliacoes_select_public ON public.avaliacoes
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS avaliacoes_insert_own ON public.avaliacoes;
CREATE POLICY avaliacoes_insert_own ON public.avaliacoes
  FOR INSERT WITH CHECK (usuario_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS avaliacoes_update_own ON public.avaliacoes;
CREATE POLICY avaliacoes_update_own ON public.avaliacoes
  FOR UPDATE USING (usuario_id = auth.uid() OR public.is_admin_user(auth.uid()))
  WITH CHECK (usuario_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS avaliacoes_delete_own ON public.avaliacoes;
CREATE POLICY avaliacoes_delete_own ON public.avaliacoes
  FOR DELETE USING (usuario_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS seguimentos_select_related ON public.seguimentos;
CREATE POLICY seguimentos_select_related ON public.seguimentos
  FOR SELECT USING (seguidor_id = auth.uid() OR seguido_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS seguimentos_insert_own ON public.seguimentos;
CREATE POLICY seguimentos_insert_own ON public.seguimentos
  FOR INSERT WITH CHECK (seguidor_id = auth.uid());

DROP POLICY IF EXISTS seguimentos_delete_own ON public.seguimentos;
CREATE POLICY seguimentos_delete_own ON public.seguimentos
  FOR DELETE USING (seguidor_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS mensagens_select_related ON public.mensagens;
CREATE POLICY mensagens_select_related ON public.mensagens
  FOR SELECT USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS mensagens_insert_sender ON public.mensagens;
CREATE POLICY mensagens_insert_sender ON public.mensagens
  FOR INSERT WITH CHECK (auth.uid() = remetente_id AND remetente_id <> destinatario_id);

DROP POLICY IF EXISTS mensagens_update_related ON public.mensagens;
CREATE POLICY mensagens_update_related ON public.mensagens
  FOR UPDATE USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = remetente_id OR auth.uid() = destinatario_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spots_select_public_approved ON public.spots;
CREATE POLICY spots_select_public_approved ON public.spots
  FOR SELECT USING (publico = TRUE OR auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spots_insert_own ON public.spots;
CREATE POLICY spots_insert_own ON public.spots
  FOR INSERT WITH CHECK (auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spots_manage_own ON public.spots;
CREATE POLICY spots_manage_own ON public.spots
  FOR UPDATE USING (auth.uid() = criador_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spots_delete_own ON public.spots;
CREATE POLICY spots_delete_own ON public.spots
  FOR DELETE USING (auth.uid() = criador_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_videos_select_visible ON public.spot_videos;
CREATE POLICY spot_videos_select_visible ON public.spot_videos
  FOR SELECT USING (ativo = TRUE OR auth.uid() = autor_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_videos_insert_own ON public.spot_videos;
CREATE POLICY spot_videos_insert_own ON public.spot_videos
  FOR INSERT WITH CHECK (auth.uid() = autor_id);

DROP POLICY IF EXISTS spot_videos_manage_own ON public.spot_videos;
CREATE POLICY spot_videos_manage_own ON public.spot_videos
  FOR UPDATE USING (auth.uid() = autor_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = autor_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_videos_delete_own ON public.spot_videos;
CREATE POLICY spot_videos_delete_own ON public.spot_videos
  FOR DELETE USING (auth.uid() = autor_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS solicitacoes_select_own_or_admin ON public.solicitacoes_publicacao;
CREATE POLICY solicitacoes_select_own_or_admin ON public.solicitacoes_publicacao
  FOR SELECT USING (auth.uid() = usuario_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS solicitacoes_insert_own ON public.solicitacoes_publicacao;
CREATE POLICY solicitacoes_insert_own ON public.solicitacoes_publicacao
  FOR INSERT WITH CHECK (auth.uid() = usuario_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS solicitacoes_update_admin ON public.solicitacoes_publicacao;
CREATE POLICY solicitacoes_update_admin ON public.solicitacoes_publicacao
  FOR UPDATE USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Storage bucket for avatars.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_select_public ON storage.objects;
CREATE POLICY avatars_select_public ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own_folder ON storage.objects;
CREATE POLICY avatars_insert_own_folder ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS avatars_update_own_folder ON storage.objects;
CREATE POLICY avatars_update_own_folder ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS avatars_delete_own_folder ON storage.objects;
CREATE POLICY avatars_delete_own_folder ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
