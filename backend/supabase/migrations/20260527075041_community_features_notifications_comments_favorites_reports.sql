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
