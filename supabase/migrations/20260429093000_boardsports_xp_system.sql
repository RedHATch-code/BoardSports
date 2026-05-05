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
  current_user UUID := auth.uid();
  normalized_estado TEXT := LOWER(BTRIM(p_estado));
  item public.submissoes%ROWTYPE;
  origem_log TEXT;
BEGIN
  IF current_user IS NULL OR NOT public.is_admin_user(current_user) THEN
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
      validado_por = current_user,
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
    validado_por = current_user,
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
  current_user UUID := auth.uid();
  normalized_status TEXT := LOWER(BTRIM(p_status));
  request_row public.solicitacoes_publicacao%ROWTYPE;
  spot_author UUID;
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
