-- ============================================================
-- Migration: 20260428090000_core_schema_seed_marketplace.sql
-- ============================================================
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


-- ============================================================
-- Migration: 20260429093000_boardsports_xp_system.sql
-- ============================================================
-- ============================================================
-- BoardSports XP System
-- Supabase/Postgres version for PAP
-- ============================================================

-- Perfil XP
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel_xp INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tipo_user VARCHAR(20) DEFAULT 'principiante';

ALTER TABLE public.profiles
  ALTER COLUMN xp_total SET DEFAULT 0,
  ALTER COLUMN nivel_xp SET DEFAULT 1,
  ALTER COLUMN tipo_user SET DEFAULT 'principiante';

UPDATE public.profiles
SET
  xp_total = COALESCE(xp_total, 0),
  nivel_xp = COALESCE(nivel_xp, 1),
  tipo_user = COALESCE(NULLIF(tipo_user, ''), 'principiante');

UPDATE public.profiles
SET tipo_user = 'principiante', nivel_xp = 1
WHERE COALESCE(xp_total, 0) = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_tipo_user_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_tipo_user_check
      CHECK (tipo_user IN ('principiante', 'intermedio', 'pro'));
  END IF;
END $$;

-- Dificuldades e XP base
CREATE TABLE IF NOT EXISTS public.xp_niveis (
  nivel INT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  xp_necessario INT NOT NULL,
  tipo_user VARCHAR(20) NOT NULL CHECK (tipo_user IN ('principiante', 'intermedio', 'pro'))
);

INSERT INTO public.xp_niveis (nivel, nome, xp_necessario, tipo_user) VALUES
(1, 'Rookie Rider', 0, 'principiante'),
(2, 'Street Starter', 250, 'principiante'),
(3, 'Local Shredder', 600, 'principiante'),
(4, 'Flow Rider', 1000, 'intermedio'),
(5, 'Trick Hunter', 1600, 'intermedio'),
(6, 'Spot Explorer', 2400, 'intermedio'),
(7, 'Combo Maker', 3500, 'intermedio'),
(8, 'Style Master', 5000, 'pro'),
(9, 'Pro Rider', 7500, 'pro'),
(10, 'BoardSports Legend', 10000, 'pro')
ON CONFLICT (nivel) DO UPDATE SET
  nome = EXCLUDED.nome,
  xp_necessario = EXCLUDED.xp_necessario,
  tipo_user = EXCLUDED.tipo_user;

CREATE TABLE IF NOT EXISTS public.manobras (
  id SERIAL PRIMARY KEY,
  modalidade_id INT NOT NULL REFERENCES public.modalidades(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  dificuldade VARCHAR(20) NOT NULL CHECK (dificuldade IN ('facil', 'media', 'dificil')),
  xp INT NOT NULL CHECK (xp > 0),
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (modalidade_id, nome)
);

-- Skate
INSERT INTO public.manobras (modalidade_id, nome, dificuldade, xp, descricao) VALUES
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Manual', 'facil', 25, 'Equilibrio nas rodas traseiras.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Ollie', 'facil', 25, 'Salto base sem agarrar a prancha.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Shuvit', 'facil', 25, 'Rotacao horizontal simples da prancha.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Kickflip', 'media', 75, 'Flip completo com pontape lateral.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Boardslide', 'media', 75, 'Slide com a prancha perpendicular ao rail.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Heelflip', 'media', 75, 'Flip com o calcanhar.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Tre Flip', 'dificil', 150, '360 shuvit combinado com kickflip.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Hardflip', 'dificil', 150, 'Frontside shuvit com kickflip.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skate'), 'Bluntslide', 'dificil', 150, 'Slide tecnico sobre o tail/truck.')
ON CONFLICT (modalidade_id, nome) DO UPDATE SET dificuldade = EXCLUDED.dificuldade, xp = EXCLUDED.xp, descricao = EXCLUDED.descricao;

-- Surf
INSERT INTO public.manobras (modalidade_id, nome, dificuldade, xp, descricao) VALUES
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Take Off', 'facil', 25, 'Entrada correta na onda.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Bottom Turn', 'facil', 25, 'Curva base no fundo da onda.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Trim Line', 'facil', 25, 'Manter linha e velocidade.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Cutback', 'media', 75, 'Voltar para a zona critica da onda.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Floater', 'media', 75, 'Passar por cima da espuma.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Snap', 'media', 75, 'Viragem rapida no lip.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Aerial', 'dificil', 150, 'Sair da onda com a prancha no ar.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Tube Ride', 'dificil', 150, 'Surfar dentro do tubo.'),
((SELECT id FROM public.modalidades WHERE nome = 'Surf'), 'Layback Hack', 'dificil', 150, 'Ataque forte com corpo inclinado.')
ON CONFLICT (modalidade_id, nome) DO UPDATE SET dificuldade = EXCLUDED.dificuldade, xp = EXCLUDED.xp, descricao = EXCLUDED.descricao;

-- Snowboard
INSERT INTO public.manobras (modalidade_id, nome, dificuldade, xp, descricao) VALUES
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Basic Carve', 'facil', 25, 'Curva controlada em pista.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Ollie', 'facil', 25, 'Salto base na prancha.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Tail Press', 'facil', 25, 'Pressao no tail em equilibrio.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Boardslide', 'media', 75, 'Slide em rail ou box.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), '180 Grab', 'media', 75, 'Rotacao 180 com grab.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), '50-50 Rail', 'media', 75, 'Deslizar alinhado sobre rail.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Backflip', 'dificil', 150, 'Mortal para tras.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Cab 540', 'dificil', 150, 'Rotacao switch de 540 graus.'),
((SELECT id FROM public.modalidades WHERE nome = 'Snowboard'), 'Double Cork', 'dificil', 150, 'Rotacao invertida avancada.')
ON CONFLICT (modalidade_id, nome) DO UPDATE SET dificuldade = EXCLUDED.dificuldade, xp = EXCLUDED.xp, descricao = EXCLUDED.descricao;

-- Sandboard
INSERT INTO public.manobras (modalidade_id, nome, dificuldade, xp, descricao) VALUES
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Straight Drop', 'facil', 25, 'Descida direta controlada.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Basic Carve', 'facil', 25, 'Curva base na duna.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Small Ollie', 'facil', 25, 'Salto curto em areia.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Dune Jump', 'media', 75, 'Salto em quebra de duna.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), '180 Spin', 'media', 75, 'Rotacao de 180 graus.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Tail Grab', 'media', 75, 'Grab no tail durante salto.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), '360 Spin', 'dificil', 150, 'Rotacao completa.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Backside Air', 'dificil', 150, 'Aereo backside em duna.'),
((SELECT id FROM public.modalidades WHERE nome = 'Sandboard'), 'Big Dune Transfer', 'dificil', 150, 'Transfer entre zonas de duna.')
ON CONFLICT (modalidade_id, nome) DO UPDATE SET dificuldade = EXCLUDED.dificuldade, xp = EXCLUDED.xp, descricao = EXCLUDED.descricao;

-- Skimboard
INSERT INTO public.manobras (modalidade_id, nome, dificuldade, xp, descricao) VALUES
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Drop In', 'facil', 25, 'Entrada na prancha em corrida.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Flatland Glide', 'facil', 25, 'Deslize controlado em agua rasa.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'One Step', 'facil', 25, 'Entrada simples com um passo.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Shuvit', 'media', 75, 'Rotacao horizontal da prancha.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Wrap', 'media', 75, 'Viragem para voltar com a onda.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Surface 360', 'media', 75, 'Rotacao de 360 graus no plano.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Big Spin', 'dificil', 150, 'Rotacao combinada rider/prancha.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Aerial Wrap', 'dificil', 150, 'Wrap com saida aerea.'),
((SELECT id FROM public.modalidades WHERE nome = 'Skimboard'), 'Kickflip', 'dificil', 150, 'Flip completo em skimboard.')
ON CONFLICT (modalidade_id, nome) DO UPDATE SET dificuldade = EXCLUDED.dificuldade, xp = EXCLUDED.xp, descricao = EXCLUDED.descricao;

CREATE TABLE IF NOT EXISTS public.combos (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome VARCHAR(150),
  prova_url VARCHAR(500),
  estado VARCHAR(20) DEFAULT 'pendente' CHECK (estado IN ('pendente', 'validado', 'rejeitado')),
  xp_total INT DEFAULT 0,
  data_submissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.combo_manobras (
  id SERIAL PRIMARY KEY,
  combo_id INT NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  manobra_id INT NOT NULL REFERENCES public.manobras(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  UNIQUE(combo_id, ordem)
);

CREATE TABLE IF NOT EXISTS public.submissoes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id INT REFERENCES public.spots(id) ON DELETE SET NULL,
  manobra_id INT REFERENCES public.manobras(id) ON DELETE SET NULL,
  combo_id INT REFERENCES public.combos(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('spot', 'manobra', 'combo')),
  prova_url VARCHAR(500) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  distancia_spot_metros INT,
  estado VARCHAR(20) DEFAULT 'pendente' CHECK (estado IN ('pendente', 'validado', 'rejeitado')),
  motivo_rejeicao VARCHAR(255),
  xp_previsto INT DEFAULT 0,
  xp_atribuido INT DEFAULT 0,
  validado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_submissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_validacao TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.xp_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origem VARCHAR(20) NOT NULL CHECK (origem IN ('spot', 'manobra', 'combo', 'like', 'badge', 'admin')),
  referencia_id INT,
  xp_ganho INT NOT NULL,
  descricao VARCHAR(255),
  data_registo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.denuncias (
  id SERIAL PRIMARY KEY,
  submissao_id INT NOT NULL REFERENCES public.submissoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivo VARCHAR(255) NOT NULL,
  data_denuncia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(submissao_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.badges (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  nome VARCHAR(80) NOT NULL,
  descricao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id INT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  data_desbloqueio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

INSERT INTO public.badges (codigo, nome, descricao) VALUES
('first_drop', 'First Drop', 'Primeira manobra validada'),
('spot_hunter', 'Spot Hunter', '10 spots completados'),
('combo_starter', 'Combo Starter', 'Primeiro combo validado'),
('trick_machine', 'Trick Machine', '25 manobras validadas'),
('local_legend', 'Local Legend', '10 spots na mesma zona'),
('pro_status', 'PRO Status', 'Chegar ao nivel PRO'),
('all_terrain_rider', 'All Terrain Rider', 'Ter XP em 3 ou mais desportos'),
('boardsports_legend', 'BoardSports Legend', 'Chegar ao nivel 10')
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao;

CREATE INDEX IF NOT EXISTS idx_profiles_xp_total ON public.profiles(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_date ON public.xp_logs(user_id, data_registo DESC);
CREATE INDEX IF NOT EXISTS idx_submissoes_estado ON public.submissoes(estado);
CREATE INDEX IF NOT EXISTS idx_submissoes_user ON public.submissoes(user_id);
CREATE INDEX IF NOT EXISTS idx_manobras_modalidade ON public.manobras(modalidade_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_submissoes_spot_validado_por_user
  ON public.submissoes(user_id, spot_id)
  WHERE tipo = 'spot' AND estado = 'validado' AND spot_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_submissoes_manobra_spot_validada_por_user
  ON public.submissoes(user_id, spot_id, manobra_id)
  WHERE tipo = 'manobra' AND estado = 'validado' AND spot_id IS NOT NULL AND manobra_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bs_nivel_por_xp(p_xp INT)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT nivel
  FROM public.xp_niveis
  WHERE xp_necessario <= GREATEST(COALESCE(p_xp, 0), 0)
  ORDER BY xp_necessario DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.bs_tipo_por_nivel(p_nivel INT)
RETURNS VARCHAR
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_nivel, 1) >= 8 THEN 'pro'
    WHEN COALESCE(p_nivel, 1) >= 4 THEN 'intermedio'
    ELSE 'principiante'
  END;
$$;

CREATE OR REPLACE FUNCTION public.bs_recalcular_perfil_xp(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_xp INT;
  next_level INT;
BEGIN
  SELECT COALESCE(SUM(xp_ganho), 0)
  INTO total_xp
  FROM public.xp_logs
  WHERE user_id = p_user_id;

  next_level := public.bs_nivel_por_xp(total_xp);

  UPDATE public.profiles
  SET
    xp_total = total_xp,
    nivel_xp = next_level,
    tipo_user = public.bs_tipo_por_nivel(next_level)
  WHERE id = p_user_id;
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.bs_nivel_por_xp(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bs_tipo_por_nivel(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bs_recalcular_perfil_xp(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderar_submissao_xp(INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_por_desporto(INT) TO authenticated, anon;

ALTER TABLE public.manobras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_niveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_manobras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manobras_select_public ON public.manobras;
CREATE POLICY manobras_select_public ON public.manobras FOR SELECT USING (ativo = TRUE);

DROP POLICY IF EXISTS xp_niveis_select_public ON public.xp_niveis;
CREATE POLICY xp_niveis_select_public ON public.xp_niveis FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS xp_logs_select_own_or_admin ON public.xp_logs;
CREATE POLICY xp_logs_select_own_or_admin ON public.xp_logs
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS submissoes_select_own_or_admin ON public.submissoes;
CREATE POLICY submissoes_select_own_or_admin ON public.submissoes
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS submissoes_insert_own ON public.submissoes;
CREATE POLICY submissoes_insert_own ON public.submissoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS submissoes_update_admin ON public.submissoes;
CREATE POLICY submissoes_update_admin ON public.submissoes
  FOR UPDATE USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS combos_select_own_or_admin ON public.combos;
CREATE POLICY combos_select_own_or_admin ON public.combos
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS combos_insert_own ON public.combos;
CREATE POLICY combos_insert_own ON public.combos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS combo_manobras_select_related ON public.combo_manobras;
CREATE POLICY combo_manobras_select_related ON public.combo_manobras
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.combos
      WHERE combos.id = combo_manobras.combo_id
        AND (combos.user_id = auth.uid() OR public.is_admin_user(auth.uid()))
    )
  );

DROP POLICY IF EXISTS denuncias_insert_own ON public.denuncias;
CREATE POLICY denuncias_insert_own ON public.denuncias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS denuncias_select_admin ON public.denuncias;
CREATE POLICY denuncias_select_admin ON public.denuncias
  FOR SELECT USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS badges_select_public ON public.badges;
CREATE POLICY badges_select_public ON public.badges FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS user_badges_select_own_or_admin ON public.user_badges;
CREATE POLICY user_badges_select_own_or_admin ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- Override da moderacao de spots: quando um spot e aprovado, atribui 100 XP ao autor.
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


-- ============================================================
-- Migration: 20260430120000_fix_spot_videos_rls.sql
-- ============================================================
ALTER TABLE public.spot_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spot_videos_select_visible ON public.spot_videos;
CREATE POLICY spot_videos_select_visible ON public.spot_videos
  FOR SELECT USING (
    ativo = TRUE
    OR auth.uid() = autor_id
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spot_videos_insert_own ON public.spot_videos;
CREATE POLICY spot_videos_insert_own ON public.spot_videos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND autor_id = auth.uid()
  );

DROP POLICY IF EXISTS spot_videos_manage_own ON public.spot_videos;
CREATE POLICY spot_videos_manage_own ON public.spot_videos
  FOR UPDATE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spot_videos_delete_own ON public.spot_videos;
CREATE POLICY spot_videos_delete_own ON public.spot_videos
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );


-- ============================================================
-- Migration: 20260430123000_daily_achievements_spot_difficulty_video_analysis.sql
-- ============================================================
ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS dificuldade VARCHAR(20) DEFAULT 'facil';

UPDATE public.spots
SET dificuldade = COALESCE(NULLIF(dificuldade, ''), 'facil');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spots_dificuldade_check'
  ) THEN
    ALTER TABLE public.spots
      ADD CONSTRAINT spots_dificuldade_check
      CHECK (dificuldade IN ('facil', 'media', 'dificil'));
  END IF;
END $$;

ALTER TABLE public.spot_videos
  ADD COLUMN IF NOT EXISTS formato VARCHAR(20) DEFAULT 'long',
  ADD COLUMN IF NOT EXISTS plataforma VARCHAR(40),
  ADD COLUMN IF NOT EXISTS analise_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analise_resultado JSONB DEFAULT '{}'::jsonb;

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
      ADD CONSTRAINT spot_videos_formato_check
      CHECK (formato IN ('short', 'long'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spot_videos_analise_score_check'
  ) THEN
    ALTER TABLE public.spot_videos
      ADD CONSTRAINT spot_videos_analise_score_check
      CHECK (analise_score BETWEEN 0 AND 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.conquistas_diarias (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  codigo VARCHAR(40) NOT NULL,
  data_conquista DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_ganho INT NOT NULL CHECK (xp_ganho > 0),
  descricao VARCHAR(255),
  data_registo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, codigo, data_conquista)
);

CREATE INDEX IF NOT EXISTS idx_conquistas_diarias_user_date
  ON public.conquistas_diarias(user_id, data_conquista DESC);

ALTER TABLE public.conquistas_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conquistas_diarias_select_own_or_admin ON public.conquistas_diarias;
CREATE POLICY conquistas_diarias_select_own_or_admin ON public.conquistas_diarias
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

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

GRANT EXECUTE ON FUNCTION public.reclamar_conquista_diaria(TEXT) TO authenticated;


-- ============================================================
-- Migration: 20260430133000_own_spot_video_delete_policies.sql
-- ============================================================
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spots_delete_own ON public.spots;
CREATE POLICY spots_delete_own ON public.spots
  FOR DELETE TO authenticated
  USING (
    criador_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spots_update_own ON public.spots;
CREATE POLICY spots_update_own ON public.spots
  FOR UPDATE TO authenticated
  USING (
    criador_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    criador_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS spot_videos_delete_own ON public.spot_videos;
CREATE POLICY spot_videos_delete_own ON public.spot_videos
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );


-- ============================================================
-- Migration: 20260505165000_auto_xp_for_spot_videos.sql
-- ============================================================
-- ============================================================
-- Award XP automatically when users publish spot videos.
-- Backfills existing spot/video activity and recalculates profiles.
-- ============================================================

ALTER TABLE public.xp_logs
  DROP CONSTRAINT IF EXISTS xp_logs_origem_check;

ALTER TABLE public.xp_logs
  ADD CONSTRAINT xp_logs_origem_check
  CHECK (origem IN ('spot', 'video', 'manobra', 'combo', 'like', 'badge', 'admin'));

CREATE INDEX IF NOT EXISTS idx_xp_logs_reference
  ON public.xp_logs(user_id, origem, referencia_id);

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

DROP TRIGGER IF EXISTS trg_award_spot_video_xp_insert ON public.spot_videos;
CREATE TRIGGER trg_award_spot_video_xp_insert
AFTER INSERT ON public.spot_videos
FOR EACH ROW
EXECUTE FUNCTION public.bs_award_spot_video_xp();

DROP TRIGGER IF EXISTS trg_award_spot_video_xp_active_update ON public.spot_videos;
CREATE TRIGGER trg_award_spot_video_xp_active_update
AFTER UPDATE OF ativo ON public.spot_videos
FOR EACH ROW
WHEN (OLD.ativo IS DISTINCT FROM NEW.ativo AND NEW.ativo = TRUE)
EXECUTE FUNCTION public.bs_award_spot_video_xp();

-- Existing videos: +40 XP per published video.
INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
SELECT
  video.autor_id,
  'video',
  video.id,
  40,
  'Video publicado num spot'
FROM public.spot_videos video
WHERE COALESCE(video.ativo, TRUE) = TRUE
  AND video.autor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.xp_logs existing
    WHERE existing.user_id = video.autor_id
      AND existing.origem = 'video'
      AND existing.referencia_id = video.id
      AND existing.descricao = 'Video publicado num spot'
  );

-- Existing spots that already have at least one active video: +60 XP once per spot.
INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
SELECT
  spot.criador_id,
  'spot',
  spot.id,
  60,
  'Spot com video publicado'
FROM public.spots spot
WHERE spot.criador_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.spot_videos video
    WHERE video.spot_id = spot.id
      AND COALESCE(video.ativo, TRUE) = TRUE
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.xp_logs existing
    WHERE existing.user_id = spot.criador_id
      AND existing.origem = 'spot'
      AND existing.referencia_id = spot.id
      AND existing.descricao = 'Spot com video publicado'
  );

DO $$
DECLARE
  affected_user UUID;
BEGIN
  FOR affected_user IN
    SELECT DISTINCT user_id
    FROM public.xp_logs
  LOOP
    PERFORM public.bs_recalcular_perfil_xp(affected_user);
  END LOOP;
END $$;


-- ============================================================
-- Migration: 20260505173000_security_rls_checkout_lock.sql
-- ============================================================
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


-- ============================================================
-- Migration: 20260506112000_fix_reserved_current_user_variables.sql
-- ============================================================
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


-- ============================================================
-- Migration: 20260508120000_make_all_spots_readable.sql
-- ============================================================
-- Torna todos os spots visíveis para qualquer visitante/utilizador.
-- Mantém as regras de escrita separadas: criar, editar e apagar continuam controlados por autenticação/RLS.

DROP POLICY IF EXISTS spots_select_public_approved ON public.spots;
DROP POLICY IF EXISTS spots_select_all ON public.spots;

CREATE POLICY spots_select_all ON public.spots
  FOR SELECT
  USING (true);


-- ============================================================
-- Migration: 20260526135216_public_read_spots_and_videos.sql
-- ============================================================
-- Make spots and spot videos readable by every visitor/user.
-- Write access remains controlled by the existing authenticated owner/admin policies.

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_videos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.spots TO anon, authenticated;
GRANT SELECT ON public.spot_videos TO anon, authenticated;

DROP POLICY IF EXISTS spots_select_public_approved ON public.spots;
DROP POLICY IF EXISTS spots_select_all ON public.spots;

CREATE POLICY spots_select_all ON public.spots
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS spot_videos_select_visible ON public.spot_videos;
DROP POLICY IF EXISTS spot_videos_select_all ON public.spot_videos;

CREATE POLICY spot_videos_select_all ON public.spot_videos
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ============================================================
-- Migration: 20260526141007_add_spot_best_season.sql
-- ============================================================
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


-- ============================================================
-- Migration: 20260527075041_community_features_notifications_comments_favorites_reports.sql
-- ============================================================
-- Community features: notifications, comments, favorites, spot images, reports and stats.

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  link_url TEXT,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comentarios (
  id BIGSERIAL PRIMARY KEY,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN ('spot', 'video')),
  entidade_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL CHECK (LENGTH(BTRIM(conteudo)) BETWEEN 1 AND 1000),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.spot_favoritos (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id INT NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, spot_id)
);

CREATE TABLE IF NOT EXISTS public.spot_imagens (
  id BIGSERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  legenda TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.denuncias (
  id BIGSERIAL PRIMARY KEY,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN ('spot', 'video', 'comentario', 'user')),
  entidade_id TEXT NOT NULL,
  denunciante_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  detalhe TEXT,
  estado TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'resolvida', 'rejeitada')),
  nota_admin TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_decisao TIMESTAMPTZ
);

ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS mensagem TEXT,
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS lida BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.comentarios
  ADD COLUMN IF NOT EXISTS entidade_tipo TEXT,
  ADD COLUMN IF NOT EXISTS entidade_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS conteudo TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.spot_favoritos
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS spot_id INT REFERENCES public.spots(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.spot_imagens
  ADD COLUMN IF NOT EXISTS spot_id INT REFERENCES public.spots(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS legenda TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS entidade_tipo TEXT,
  ADD COLUMN IF NOT EXISTS entidade_id TEXT,
  ADD COLUMN IF NOT EXISTS denunciante_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS detalhe TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS nota_admin TEXT,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_decisao TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes(user_id, lida, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_entidade ON public.comentarios(entidade_tipo, entidade_id, ativo, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_spot_favoritos_spot ON public.spot_favoritos(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_imagens_spot ON public.spot_imagens(spot_id, ativo, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_denuncias_estado ON public.denuncias(estado, data_criacao DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.notificacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.comentarios TO authenticated;
GRANT SELECT ON public.comentarios TO anon;
GRANT SELECT, INSERT, DELETE ON public.spot_favoritos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.spot_imagens TO authenticated;
GRANT SELECT ON public.spot_imagens TO anon;
GRANT SELECT, INSERT, UPDATE ON public.denuncias TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

DROP POLICY IF EXISTS notificacoes_select_own ON public.notificacoes;
CREATE POLICY notificacoes_select_own ON public.notificacoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS notificacoes_update_own ON public.notificacoes;
CREATE POLICY notificacoes_update_own ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS notificacoes_insert_admin ON public.notificacoes;
CREATE POLICY notificacoes_insert_admin ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS comentarios_select_public ON public.comentarios;
CREATE POLICY comentarios_select_public ON public.comentarios
  FOR SELECT TO anon, authenticated
  USING (ativo = TRUE OR user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS comentarios_insert_own ON public.comentarios;
CREATE POLICY comentarios_insert_own ON public.comentarios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS comentarios_update_own ON public.comentarios;
CREATE POLICY comentarios_update_own ON public.comentarios
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS favoritos_select_own ON public.spot_favoritos;
CREATE POLICY favoritos_select_own ON public.spot_favoritos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS favoritos_insert_own ON public.spot_favoritos;
CREATE POLICY favoritos_insert_own ON public.spot_favoritos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS favoritos_delete_own ON public.spot_favoritos;
CREATE POLICY favoritos_delete_own ON public.spot_favoritos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_imagens_select_public ON public.spot_imagens;
CREATE POLICY spot_imagens_select_public ON public.spot_imagens
  FOR SELECT TO anon, authenticated
  USING (ativo = TRUE OR user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_imagens_insert_own ON public.spot_imagens;
CREATE POLICY spot_imagens_insert_own ON public.spot_imagens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS spot_imagens_update_own ON public.spot_imagens;
CREATE POLICY spot_imagens_update_own ON public.spot_imagens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS denuncias_select_own_admin ON public.denuncias;
CREATE POLICY denuncias_select_own_admin ON public.denuncias
  FOR SELECT TO authenticated
  USING (denunciante_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS denuncias_insert_own ON public.denuncias;
CREATE POLICY denuncias_insert_own ON public.denuncias
  FOR INSERT TO authenticated
  WITH CHECK (denunciante_id = auth.uid());

DROP POLICY IF EXISTS denuncias_update_admin ON public.denuncias;
CREATE POLICY denuncias_update_admin ON public.denuncias
  FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spot-images',
  'spot-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS spot_images_storage_select_public ON storage.objects;
CREATE POLICY spot_images_storage_select_public ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'spot-images');

DROP POLICY IF EXISTS spot_images_storage_insert_own ON storage.objects;
CREATE POLICY spot_images_storage_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'spot-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS spot_images_storage_update_own ON storage.objects;
CREATE POLICY spot_images_storage_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'spot-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE OR REPLACE FUNCTION public.bs_criar_notificacao(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensagem TEXT DEFAULT NULL,
  p_link_url TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, link_url)
  VALUES (p_user_id, p_tipo, p_titulo, p_mensagem, p_link_url)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bs_criar_notificacao(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderar_denuncia(
  p_denuncia_id BIGINT,
  p_estado TEXT,
  p_nota_admin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  normalized_estado TEXT := LOWER(BTRIM(p_estado));
  report_row public.denuncias%ROWTYPE;
BEGIN
  IF v_current_user IS NULL OR NOT public.is_admin_user(v_current_user) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF normalized_estado NOT IN ('resolvida', 'rejeitada') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT *
  INTO report_row
  FROM public.denuncias
  WHERE id = p_denuncia_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_FOUND';
  END IF;

  UPDATE public.denuncias
  SET estado = normalized_estado,
      nota_admin = NULLIF(BTRIM(p_nota_admin), ''),
      data_decisao = NOW()
  WHERE id = p_denuncia_id;

  PERFORM public.bs_criar_notificacao(
    report_row.denunciante_id,
    'denuncia_' || normalized_estado,
    CASE WHEN normalized_estado = 'resolvida' THEN 'Denuncia resolvida' ELSE 'Denuncia rejeitada' END,
    COALESCE(NULLIF(BTRIM(p_nota_admin), ''), 'A tua denuncia foi revista pela moderação.'),
    '/notificacoes.html'
  );

  RETURN jsonb_build_object('denuncia_id', p_denuncia_id, 'estado', normalized_estado);
END;
$$;

GRANT EXECUTE ON FUNCTION public.moderar_denuncia(BIGINT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.spot_estatisticas(p_spot_id INT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'spot_id', p_spot_id,
    'videos', (SELECT COUNT(*) FROM public.spot_videos WHERE spot_id = p_spot_id AND ativo = TRUE),
    'comentarios', (SELECT COUNT(*) FROM public.comentarios WHERE entidade_tipo = 'spot' AND entidade_id = p_spot_id::TEXT AND ativo = TRUE),
    'favoritos', (SELECT COUNT(*) FROM public.spot_favoritos WHERE spot_id = p_spot_id),
    'imagens', (SELECT COUNT(*) FROM public.spot_imagens WHERE spot_id = p_spot_id AND ativo = TRUE)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_estatisticas(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'spots', (SELECT COUNT(*) FROM public.spots WHERE criador_id = p_user_id),
    'videos', (SELECT COUNT(*) FROM public.spot_videos WHERE autor_id = p_user_id AND ativo = TRUE),
    'comentarios', (SELECT COUNT(*) FROM public.comentarios WHERE user_id = p_user_id AND ativo = TRUE),
    'favoritos', (SELECT COUNT(*) FROM public.spot_favoritos WHERE user_id = p_user_id),
    'xp_total', COALESCE((SELECT xp_total FROM public.profiles WHERE id = p_user_id), 0),
    'nivel_xp', COALESCE((SELECT nivel_xp FROM public.profiles WHERE id = p_user_id), 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.spot_estatisticas(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_estatisticas(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.bs_notify_moderated_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spot_author UUID;
  spot_name TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.status = NEW.status OR NEW.status NOT IN ('aprovado', 'rejeitado') THEN
    RETURN NEW;
  END IF;

  SELECT criador_id, nome
  INTO spot_author, spot_name
  FROM public.spots
  WHERE id = NEW.spot_id;

  PERFORM public.bs_criar_notificacao(
    COALESCE(spot_author, NEW.usuario_id),
    'spot_' || NEW.status,
    CASE WHEN NEW.status = 'aprovado' THEN 'Spot aprovado' ELSE 'Spot rejeitado' END,
    COALESCE(NEW.mensagem_admin, CASE WHEN NEW.status = 'aprovado' THEN 'O teu spot ja esta visivel no mapa.' ELSE 'O teu pedido foi rejeitado pela moderacao.' END),
    '/spot.html?id=' || NEW.spot_id::TEXT
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_moderated_publication ON public.solicitacoes_publicacao;
CREATE TRIGGER trg_notify_moderated_publication
  AFTER UPDATE OF status ON public.solicitacoes_publicacao
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_notify_moderated_publication();

CREATE OR REPLACE FUNCTION public.bs_notify_moderated_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.estado = NEW.estado OR NEW.estado NOT IN ('validado', 'rejeitado') THEN
    RETURN NEW;
  END IF;

  PERFORM public.bs_criar_notificacao(
    NEW.user_id,
    'xp_' || NEW.estado,
    CASE WHEN NEW.estado = 'validado' THEN 'XP validado' ELSE 'XP rejeitado' END,
    CASE WHEN NEW.estado = 'validado'
      THEN 'A tua submissao foi validada. XP atribuido: +' || COALESCE(NEW.xp_atribuido, NEW.xp_previsto, 0)::TEXT
      ELSE COALESCE(NEW.motivo_rejeicao, 'A tua submissao foi rejeitada pela moderacao.')
    END,
    CASE WHEN NEW.spot_id IS NOT NULL THEN '/spot.html?id=' || NEW.spot_id::TEXT ELSE '/notificacoes.html' END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_moderated_xp ON public.submissoes;
CREATE TRIGGER trg_notify_moderated_xp
  AFTER UPDATE OF estado ON public.submissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_notify_moderated_xp();

CREATE OR REPLACE FUNCTION public.bs_notify_new_spot_video()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spot_author UUID;
  spot_name TEXT;
BEGIN
  SELECT criador_id, nome
  INTO spot_author, spot_name
  FROM public.spots
  WHERE id = NEW.spot_id;

  IF spot_author IS NOT NULL AND spot_author <> NEW.autor_id THEN
    PERFORM public.bs_criar_notificacao(
      spot_author,
      'spot_video',
      'Novo video no teu spot',
      'Alguem publicou um video em ' || COALESCE(spot_name, 'um dos teus spots') || '.',
      '/spot.html?id=' || NEW.spot_id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_spot_video ON public.spot_videos;
CREATE TRIGGER trg_notify_new_spot_video
  AFTER INSERT ON public.spot_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.bs_notify_new_spot_video();


-- ============================================================
-- Migration: 20260529135212_community_spot_features.sql
-- ============================================================
-- ============================================================
-- BoardSports community spot features
-- Notifications, spot detail data, comments, favorites,
-- image uploads, reports, recommendations support and stats.
-- ============================================================

-- Spot metadata used by recommendations, seasonality and condition pages.
ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS melhor_epoca_meses INT[] DEFAULT '{}'::INT[],
  ADD COLUMN IF NOT EXISTS melhor_epoca_notas TEXT;

-- Lightweight XP columns used by notifications and user statistics. The
-- full XP migration may add logs, levels and moderation workflows.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel_xp INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tipo_user TEXT DEFAULT 'principiante';

UPDATE public.profiles
SET
  xp_total = COALESCE(xp_total, 0),
  nivel_xp = COALESCE(nivel_xp, 1),
  tipo_user = COALESCE(NULLIF(tipo_user, ''), 'principiante');

-- Notifications for approvals, rejections, XP and community activity.
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'sistema',
  titulo TEXT NOT NULL,
  mensagem TEXT,
  link_url TEXT,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'sistema',
  ADD COLUMN IF NOT EXISTS titulo TEXT NOT NULL DEFAULT 'Notificacao',
  ADD COLUMN IF NOT EXISTS mensagem TEXT,
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS lida BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Generic comments for spots and videos.
CREATE TABLE IF NOT EXISTS public.comentarios (
  id BIGSERIAL PRIMARY KEY,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN ('spot', 'video', 'user')),
  entidade_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL CHECK (char_length(btrim(conteudo)) BETWEEN 1 AND 2000),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comentarios
  ADD COLUMN IF NOT EXISTS entidade_tipo TEXT,
  ADD COLUMN IF NOT EXISTS entidade_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS conteudo TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Saved spots.
CREATE TABLE IF NOT EXISTS public.spot_favoritos (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id INT NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, spot_id)
);

-- Direct image uploads for spot pages.
CREATE TABLE IF NOT EXISTS public.spot_imagens (
  id BIGSERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  legenda TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.spot_imagens
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS legenda TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Generic reporting/moderation. This also upgrades the old XP-only
-- denuncias table if it already exists.
CREATE TABLE IF NOT EXISTS public.denuncias (
  id BIGSERIAL PRIMARY KEY,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN ('spot', 'video', 'comment', 'comentario', 'user', 'submissao')),
  entidade_id TEXT NOT NULL,
  denunciante_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  detalhe TEXT,
  estado TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'resolvida', 'rejeitada')),
  nota_admin TEXT,
  moderador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_decisao TIMESTAMPTZ
);

ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS entidade_tipo TEXT,
  ADD COLUMN IF NOT EXISTS entidade_id TEXT,
  ADD COLUMN IF NOT EXISTS denunciante_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS detalhe TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS nota_admin TEXT,
  ADD COLUMN IF NOT EXISTS moderador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS data_decisao TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'denuncias'
      AND column_name = 'submissao_id'
  ) THEN
    ALTER TABLE public.denuncias ALTER COLUMN submissao_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'denuncias'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.denuncias ALTER COLUMN user_id DROP NOT NULL;

    UPDATE public.denuncias
    SET denunciante_id = COALESCE(denunciante_id, user_id)
    WHERE denunciante_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'denuncias'
      AND column_name = 'submissao_id'
  ) THEN
    UPDATE public.denuncias
    SET
      entidade_tipo = COALESCE(entidade_tipo, 'submissao'),
      entidade_id = COALESCE(entidade_id, submissao_id::TEXT)
    WHERE entidade_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'denuncias'
      AND column_name = 'data_denuncia'
  ) THEN
    UPDATE public.denuncias
    SET data_criacao = COALESCE(data_criacao, data_denuncia)
    WHERE data_criacao IS NULL;
  END IF;
END $$;

UPDATE public.denuncias
SET estado = COALESCE(NULLIF(estado, ''), 'pendente');

-- Indexes.
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida_data
  ON public.notificacoes(user_id, lida, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_entidade
  ON public.comentarios(entidade_tipo, entidade_id, ativo, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_user
  ON public.comentarios(user_id, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_spot_favoritos_spot
  ON public.spot_favoritos(spot_id, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_spot_imagens_spot
  ON public.spot_imagens(spot_id, ativo, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_denuncias_estado
  ON public.denuncias(estado, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_denuncias_entidade
  ON public.denuncias(entidade_tipo, entidade_id);

-- Data API grants. RLS below still controls row access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios TO authenticated;
GRANT SELECT ON public.comentarios TO anon;
GRANT SELECT, INSERT, DELETE ON public.spot_favoritos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spot_imagens TO authenticated;
GRANT SELECT ON public.spot_imagens TO anon;
GRANT SELECT, INSERT, UPDATE ON public.denuncias TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- RLS policies.
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notificacoes_select_own_or_admin ON public.notificacoes;
CREATE POLICY notificacoes_select_own_or_admin ON public.notificacoes
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS notificacoes_insert_admin ON public.notificacoes;
CREATE POLICY notificacoes_insert_admin ON public.notificacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS notificacoes_update_own_or_admin ON public.notificacoes;
CREATE POLICY notificacoes_update_own_or_admin ON public.notificacoes
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS comentarios_select_visible ON public.comentarios;
CREATE POLICY comentarios_select_visible ON public.comentarios
  FOR SELECT USING (ativo = TRUE OR auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS comentarios_insert_own ON public.comentarios;
CREATE POLICY comentarios_insert_own ON public.comentarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS comentarios_update_own_or_admin ON public.comentarios;
CREATE POLICY comentarios_update_own_or_admin ON public.comentarios
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_favoritos_select_own ON public.spot_favoritos;
CREATE POLICY spot_favoritos_select_own ON public.spot_favoritos
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_favoritos_insert_own ON public.spot_favoritos;
CREATE POLICY spot_favoritos_insert_own ON public.spot_favoritos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS spot_favoritos_delete_own ON public.spot_favoritos;
CREATE POLICY spot_favoritos_delete_own ON public.spot_favoritos
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_imagens_select_visible ON public.spot_imagens;
CREATE POLICY spot_imagens_select_visible ON public.spot_imagens
  FOR SELECT USING (ativo = TRUE OR auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS spot_imagens_insert_own ON public.spot_imagens;
CREATE POLICY spot_imagens_insert_own ON public.spot_imagens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS spot_imagens_update_own_or_admin ON public.spot_imagens;
CREATE POLICY spot_imagens_update_own_or_admin ON public.spot_imagens
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS denuncias_insert_own_generic ON public.denuncias;
CREATE POLICY denuncias_insert_own_generic ON public.denuncias
  FOR INSERT WITH CHECK (auth.uid() = denunciante_id);

DROP POLICY IF EXISTS denuncias_select_own_or_admin_generic ON public.denuncias;
CREATE POLICY denuncias_select_own_or_admin_generic ON public.denuncias
  FOR SELECT USING (auth.uid() = denunciante_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS denuncias_update_admin_generic ON public.denuncias;
CREATE POLICY denuncias_update_admin_generic ON public.denuncias
  FOR UPDATE USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Public storage bucket for uploaded spot images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spot-images',
  'spot-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS spot_images_select_public ON storage.objects;
CREATE POLICY spot_images_select_public ON storage.objects
  FOR SELECT USING (bucket_id = 'spot-images');

DROP POLICY IF EXISTS spot_images_insert_own_folder ON storage.objects;
CREATE POLICY spot_images_insert_own_folder ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'spot-images'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS spot_images_update_own_folder ON storage.objects;
CREATE POLICY spot_images_update_own_folder ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'spot-images'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS spot_images_delete_own_folder ON storage.objects;
CREATE POLICY spot_images_delete_own_folder ON storage.objects
  FOR DELETE USING (
    bucket_id = 'spot-images'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE OR REPLACE FUNCTION public.bs_notify(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensagem TEXT DEFAULT NULL,
  p_link_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_id BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, link_url, metadata)
  VALUES (
    p_user_id,
    COALESCE(NULLIF(BTRIM(p_tipo), ''), 'sistema'),
    COALESCE(NULLIF(BTRIM(p_titulo), ''), 'Notificacao'),
    NULLIF(BTRIM(p_mensagem), ''),
    NULLIF(BTRIM(p_link_url), ''),
    COALESCE(p_metadata, '{}'::JSONB)
  )
  RETURNING id INTO created_id;

  RETURN created_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bs_notify(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.spot_estatisticas(p_spot_id INT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'videos', COALESCE((SELECT COUNT(*) FROM public.spot_videos WHERE spot_id = p_spot_id AND COALESCE(ativo, TRUE) = TRUE), 0),
    'comentarios', COALESCE((SELECT COUNT(*) FROM public.comentarios WHERE entidade_tipo = 'spot' AND entidade_id = p_spot_id::TEXT AND ativo = TRUE), 0),
    'favoritos', COALESCE((SELECT COUNT(*) FROM public.spot_favoritos WHERE spot_id = p_spot_id), 0),
    'imagens', COALESCE((SELECT COUNT(*) FROM public.spot_imagens WHERE spot_id = p_spot_id AND ativo = TRUE), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_estatisticas(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'spots', COALESCE((SELECT COUNT(*) FROM public.spots WHERE criador_id = p_user_id AND ativo = TRUE), 0),
    'spots_publicos', COALESCE((SELECT COUNT(*) FROM public.spots WHERE criador_id = p_user_id AND ativo = TRUE AND publico = TRUE), 0),
    'videos', COALESCE((SELECT COUNT(*) FROM public.spot_videos WHERE autor_id = p_user_id AND COALESCE(ativo, TRUE) = TRUE), 0),
    'comentarios', COALESCE((SELECT COUNT(*) FROM public.comentarios WHERE user_id = p_user_id AND ativo = TRUE), 0),
    'favoritos', COALESCE((SELECT COUNT(*) FROM public.spot_favoritos WHERE user_id = p_user_id), 0),
    'imagens', COALESCE((SELECT COUNT(*) FROM public.spot_imagens WHERE user_id = p_user_id AND ativo = TRUE), 0),
    'denuncias', COALESCE((SELECT COUNT(*) FROM public.denuncias WHERE denunciante_id = p_user_id), 0),
    'xp_total', COALESCE((SELECT xp_total FROM public.profiles WHERE id = p_user_id), 0),
    'nivel_xp', COALESCE((SELECT nivel_xp FROM public.profiles WHERE id = p_user_id), 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.spot_estatisticas(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_estatisticas(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderar_denuncia(
  p_denuncia_id BIGINT,
  p_estado TEXT,
  p_nota_admin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  normalized_estado TEXT := LOWER(BTRIM(p_estado));
  report_row public.denuncias%ROWTYPE;
BEGIN
  IF v_current_user IS NULL OR NOT public.is_admin_user(v_current_user) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF normalized_estado NOT IN ('resolvida', 'rejeitada') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT *
  INTO report_row
  FROM public.denuncias
  WHERE id = p_denuncia_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_FOUND';
  END IF;

  UPDATE public.denuncias
  SET
    estado = normalized_estado,
    nota_admin = NULLIF(BTRIM(p_nota_admin), ''),
    moderador_id = v_current_user,
    data_decisao = NOW()
  WHERE id = p_denuncia_id;

  PERFORM public.bs_notify(
    report_row.denunciante_id,
    'denuncia',
    CASE WHEN normalized_estado = 'resolvida' THEN 'Denuncia resolvida' ELSE 'Denuncia rejeitada' END,
    COALESCE(NULLIF(BTRIM(p_nota_admin), ''), 'A tua denuncia foi revista pela moderacao.'),
    CASE report_row.entidade_tipo
      WHEN 'spot' THEN '/spot.html?id=' || report_row.entidade_id
      WHEN 'video' THEN '/videos.html'
      ELSE '/notificacoes.html'
    END,
    jsonb_build_object('denuncia_id', report_row.id, 'estado', normalized_estado)
  );

  RETURN jsonb_build_object('denuncia_id', report_row.id, 'estado', normalized_estado);
END;
$$;

GRANT EXECUTE ON FUNCTION public.moderar_denuncia(BIGINT, TEXT, TEXT) TO authenticated;

-- Override spot publication moderation to emit notifications and award XP when available.
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
  spot_name TEXT;
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
    data_decisao = NOW()
  WHERE id = p_solicitacao_id;

  UPDATE public.spots
  SET
    publico = (normalized_status = 'aprovado'),
    data_atualizacao = NOW()
  WHERE id = request_row.spot_id
  RETURNING criador_id, nome INTO spot_author, spot_name;

  IF normalized_status = 'aprovado'
     AND spot_author IS NOT NULL
     AND to_regclass('public.xp_logs') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
      SELECT $1, 'spot', $2, 100, 'Novo spot aprovado pela moderacao'
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.xp_logs
        WHERE user_id = $1
          AND origem = 'spot'
          AND referencia_id = $2
          AND descricao = 'Novo spot aprovado pela moderacao'
      )
    $sql$ USING spot_author, request_row.spot_id;

    IF to_regprocedure('public.bs_recalcular_perfil_xp(uuid)') IS NOT NULL THEN
      PERFORM public.bs_recalcular_perfil_xp(spot_author);
    END IF;
  END IF;

  PERFORM public.bs_notify(
    COALESCE(request_row.usuario_id, spot_author),
    CASE WHEN normalized_status = 'aprovado' THEN 'aprovacao' ELSE 'rejeicao' END,
    CASE WHEN normalized_status = 'aprovado' THEN 'Spot aprovado' ELSE 'Spot rejeitado' END,
    COALESCE(
      NULLIF(BTRIM(p_mensagem_admin), ''),
      CASE
        WHEN normalized_status = 'aprovado' THEN 'O teu spot "' || COALESCE(spot_name, '#' || request_row.spot_id::TEXT) || '" ja esta publico.'
        ELSE 'O teu pedido de publicacao foi rejeitado pela moderacao.'
      END
    ),
    CASE WHEN normalized_status = 'aprovado' THEN '/spot.html?id=' || request_row.spot_id ELSE '/moderacao.html' END,
    jsonb_build_object('spot_id', request_row.spot_id, 'status', normalized_status)
  );

  IF normalized_status = 'aprovado' AND spot_author IS NOT NULL THEN
    PERFORM public.bs_notify(
      spot_author,
      'xp',
      '+100 XP por spot aprovado',
      'Recebeste XP por contribuir com um novo spot publico.',
      '/spot.html?id=' || request_row.spot_id,
      jsonb_build_object('spot_id', request_row.spot_id, 'xp', 100)
    );
  END IF;

  RETURN jsonb_build_object(
    'solicitacao_id', request_row.id,
    'spot_id', request_row.spot_id,
    'status', normalized_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.moderar_solicitacao_publicacao(INT, TEXT, TEXT) TO authenticated;

-- Notify spot/video authors about new comments.
CREATE OR REPLACE FUNCTION public.bs_notify_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  target_name TEXT;
BEGIN
  IF NEW.entidade_tipo = 'spot' THEN
    SELECT criador_id, nome INTO owner_id, target_name
    FROM public.spots
    WHERE id = NULLIF(NEW.entidade_id, '')::INT;
  ELSIF NEW.entidade_tipo = 'video' THEN
    SELECT spot_videos.autor_id, COALESCE(spots.nome, 'video')
    INTO owner_id, target_name
    FROM public.spot_videos
    LEFT JOIN public.spots ON spots.id = spot_videos.spot_id
    WHERE spot_videos.id = NULLIF(NEW.entidade_id, '')::INT;
  END IF;

  IF owner_id IS NOT NULL AND owner_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.bs_notify(
      owner_id,
      'comentario',
      'Novo comentario',
      'A comunidade comentou em ' || COALESCE(target_name, 'um conteudo teu') || '.',
      CASE
        WHEN NEW.entidade_tipo = 'spot' THEN '/spot.html?id=' || NEW.entidade_id
        WHEN NEW.entidade_tipo = 'video' THEN '/videos.html'
        ELSE '/notificacoes.html'
      END,
      jsonb_build_object('comentario_id', NEW.id, 'entidade_tipo', NEW.entidade_tipo, 'entidade_id', NEW.entidade_id)
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_comment ON public.comentarios;
CREATE TRIGGER trg_notify_new_comment
AFTER INSERT ON public.comentarios
FOR EACH ROW
EXECUTE FUNCTION public.bs_notify_new_comment();

-- Notify users when XP logs are created, if the XP system is installed.
CREATE OR REPLACE FUNCTION public.bs_notify_xp_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bs_notify(
    NEW.user_id,
    'xp',
    '+' || COALESCE(NEW.xp_ganho, 0)::TEXT || ' XP',
    COALESCE(NEW.descricao, 'Recebeste XP na BoardSports.'),
    '/perfil.html',
    jsonb_build_object('xp_log_id', NEW.id, 'xp', NEW.xp_ganho, 'origem', NEW.origem)
  );

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.xp_logs') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_xp_log ON public.xp_logs;
    CREATE TRIGGER trg_notify_xp_log
    AFTER INSERT ON public.xp_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.bs_notify_xp_log();
  END IF;
END $$;


-- ============================================================
-- Migration: 20260608103000_video_authoring_xp.sql
-- ============================================================
-- ============================================================
-- Video authoring type and XP adjustment.
-- proprio: user appears performing the sport (+40 XP)
-- filmado: user filmed another person (+20 XP)
-- terceiros: third-party video (0 XP)
-- ============================================================

ALTER TABLE public.spot_videos
  ADD COLUMN IF NOT EXISTS tipo_autoria TEXT DEFAULT 'proprio',
  ADD COLUMN IF NOT EXISTS xp_video INT DEFAULT 40;

UPDATE public.spot_videos
SET
  tipo_autoria = COALESCE(tipo_autoria, 'proprio'),
  xp_video = COALESCE(xp_video, 40);

ALTER TABLE public.spot_videos
  DROP CONSTRAINT IF EXISTS spot_videos_tipo_autoria_check;

ALTER TABLE public.spot_videos
  ADD CONSTRAINT spot_videos_tipo_autoria_check
  CHECK (tipo_autoria IN ('proprio', 'filmado', 'terceiros'));

ALTER TABLE public.spot_videos
  DROP CONSTRAINT IF EXISTS spot_videos_xp_video_check;

ALTER TABLE public.spot_videos
  ADD CONSTRAINT spot_videos_xp_video_check
  CHECK (xp_video IN (0, 20, 40));

CREATE OR REPLACE FUNCTION public.bs_award_spot_video_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spot_author UUID;
  video_xp INT;
  video_description TEXT;
BEGIN
  IF COALESCE(NEW.ativo, TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  video_xp := CASE COALESCE(NEW.tipo_autoria, 'proprio')
    WHEN 'proprio' THEN 40
    WHEN 'filmado' THEN 20
    WHEN 'terceiros' THEN 0
    ELSE COALESCE(NEW.xp_video, 40)
  END;

  NEW.xp_video := video_xp;
  video_description := CASE COALESCE(NEW.tipo_autoria, 'proprio')
    WHEN 'filmado' THEN 'Video filmado pelo utilizador num spot'
    WHEN 'terceiros' THEN 'Video de terceiros publicado num spot'
    ELSE 'Video publicado pelo proprio rider num spot'
  END;

  IF NEW.autor_id IS NOT NULL AND video_xp > 0 THEN
    INSERT INTO public.xp_logs (user_id, origem, referencia_id, xp_ganho, descricao)
    SELECT
      NEW.autor_id,
      'video',
      NEW.id,
      video_xp,
      video_description
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.xp_logs
      WHERE user_id = NEW.autor_id
        AND origem = 'video'
        AND referencia_id = NEW.id
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

UPDATE public.xp_logs AS log
SET
  xp_ganho = CASE COALESCE(video.tipo_autoria, 'proprio')
    WHEN 'proprio' THEN 40
    WHEN 'filmado' THEN 20
    WHEN 'terceiros' THEN 0
    ELSE COALESCE(video.xp_video, 40)
  END,
  descricao = CASE COALESCE(video.tipo_autoria, 'proprio')
    WHEN 'filmado' THEN 'Video filmado pelo utilizador num spot'
    WHEN 'terceiros' THEN 'Video de terceiros publicado num spot'
    ELSE 'Video publicado pelo proprio rider num spot'
  END
FROM public.spot_videos video
WHERE log.origem = 'video'
  AND log.referencia_id = video.id;

DELETE FROM public.xp_logs
USING public.spot_videos video
WHERE xp_logs.origem = 'video'
  AND xp_logs.referencia_id = video.id
  AND COALESCE(video.tipo_autoria, 'proprio') = 'terceiros';

DO $$
DECLARE
  affected_user UUID;
BEGIN
  FOR affected_user IN
    SELECT DISTINCT user_id
    FROM public.xp_logs
  LOOP
    PERFORM public.bs_recalcular_perfil_xp(affected_user);
  END LOOP;
END $$;


