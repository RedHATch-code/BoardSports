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
