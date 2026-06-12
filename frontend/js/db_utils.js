import { supabase } from './supabase.js'

/**
 * BoardSports Inc - Utilitários de Base de Dados
 */

// ============================================================
// 1. FUNÇÕES DE MODALIDADES
// ============================================================

export async function obterModalidades() {
  try {
    const { data, error } = await supabase
      .from('modalidades')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter modalidades:', error)
    return []
  }
}

async function countRows(table, configureQuery = null) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })

  if (typeof configureQuery === 'function') {
    query = configureQuery(query)
  }

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

export async function obterEstatisticasDashboard() {
  try {
    const [eventos, riders, pendentesModeração] = await Promise.all([
      countRows('eventos', (query) => query.eq('ativo', true)),
      countRows('public_profiles', (query) => query.eq('ativo', true)),
      countRows('solicitacoes_publicacao', (query) => query.eq('status', 'pendente'))
    ])

    return {
      eventos,
      riders,
      pendentesModeração
    }
  } catch (error) {
    console.error('Erro ao obter estatisticas do dashboard:', error)
    return {
      eventos: 0,
      riders: 0,
      pendentesModeração: 0
    }
  }
}

// ============================================================
// 2. FUNCOES DE EVENTOS
// ============================================================

export async function obterEventos(filtros = {}) {
  try {
    let query = supabase
      .from('eventos')
      .select('*, modalidades(nome), profiles(nome)')
      .eq('ativo', true)
      .order('data_inicio')

    if (filtros.modalidade) {
      query = query.eq('modalidade_id', filtros.modalidade)
    }

    if (Array.isArray(filtros.ids) && filtros.ids.length) {
      query = query.in('id', filtros.ids)
    }

    if (filtros.criador_id) {
      query = query.eq('criador_id', filtros.criador_id)
    }

    if (filtros.proximo) {
      query = query.gte('data_inicio', new Date().toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []).map((evento) => ({
      ...evento,
      modalidade: evento.modalidades?.nome || '',
      criador_nome: evento.profiles?.nome || 'Utilizador'
    }))
  } catch (error) {
    console.error('Erro ao obter eventos:', error)
    return []
  }
}

export async function criarEvento(evento) {
  try {
    const { data, error } = await supabase
      .from('eventos')
      .insert([evento])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar evento:', error)
    return null
  }
}

export async function obterEvento(id) {
  try {
    const { data, error } = await supabase
      .from('eventos')
      .select('*, modalidades(nome), profiles(nome)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao obter evento:', error)
    return null
  }
}

export async function atualizarEvento(id, updates) {
  try {
    const { data, error } = await supabase
      .from('eventos')
      .update({
        nome: updates.nome,
        descricao: updates.descricao,
        modalidade_id: updates.modalidade_id,
        data_inicio: updates.data_inicio,
        data_fim: updates.data_fim,
        localidade: updates.localidade,
        coordenadas_lat: updates.coordenadas_lat,
        coordenadas_long: updates.coordenadas_long,
        data_atualizacao: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar evento:', error)
    return null
  }
}

export async function apagarEvento(id) {
  try {
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao apagar evento:', error)
    return false
  }
}

export async function inscreverEvento(evento_id, atleta_id) {
  try {
    const { data, error } = await supabase
      .from('participacoes_eventos')
      .insert([{
        evento_id,
        atleta_id,
        confirmado: false
      }])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao inscrever em evento:', error)
    return null
  }
}

export async function cancelarInscricaoEvento(evento_id, atleta_id) {
  try {
    const { error } = await supabase
      .from('participacoes_eventos')
      .delete()
      .eq('evento_id', evento_id)
      .eq('atleta_id', atleta_id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao cancelar inscricao no evento:', error)
    return false
  }
}

export async function obterInscricoesUsuario(usuario_id) {
  try {
    const { data: inscricoes, error: inscricoesError } = await supabase
      .from('participacoes_eventos')
      .select('id, evento_id, atleta_id, confirmado, data_inscricao')
      .eq('atleta_id', usuario_id)
      .order('data_inscricao', { ascending: false })

    if (inscricoesError) throw inscricoesError

    const eventoIds = [...new Set((inscricoes || []).map((item) => item.evento_id).filter(Boolean))]
    if (!eventoIds.length) return []

    const eventos = await obterEventos({ ids: eventoIds })
    const eventosMap = new Map(eventos.map((evento) => [evento.id, evento]))

    return (inscricoes || []).map((inscricao) => ({
      ...inscricao,
      evento: eventosMap.get(inscricao.evento_id) || null
    }))
  } catch (error) {
    console.error('Erro ao obter inscricoes do utilizador:', error)
    return []
  }
}

export async function obterParticipantesPorEventos(eventoIds = []) {
  try {
    const ids = [...new Set((eventoIds || []).map((id) => Number(id)).filter(Number.isFinite))]
    if (!ids.length) return []

    const { data: participacoes, error } = await supabase
      .from('participacoes_eventos')
      .select('id, evento_id, atleta_id, confirmado, data_inscricao')
      .in('evento_id', ids)
      .order('data_inscricao', { ascending: false })

    if (error) throw error

    const atletaIds = [...new Set((participacoes || []).map((item) => item.atleta_id).filter(Boolean))]
    const { data: atletas, error: atletasError } = atletaIds.length
      ? await supabase
          .from('public_profiles')
          .select('id, nome, foto_perfil')
          .in('id', atletaIds)
      : { data: [], error: null }

    if (atletasError) throw atletasError

    const atletasMap = new Map((atletas || []).map((atleta) => [atleta.id, atleta]))

    return (participacoes || []).map((participacao) => ({
      ...participacao,
      atleta: atletasMap.get(participacao.atleta_id) || null
    }))
  } catch (error) {
    console.error('Erro ao obter participantes dos eventos:', error)
    return []
  }
}

export async function atualizarParticipacaoEvento(id, updates) {
  try {
    const { data, error } = await supabase
      .from('participacoes_eventos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar participacao no evento:', error)
    return null
  }
}

export async function removerParticipacaoEvento(id) {
  try {
    const { error } = await supabase
      .from('participacoes_eventos')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao remover participacao do evento:', error)
    return false
  }
}

// ============================================================
// 5. FUNÇÕES DE PERFIL
// ============================================================

export async function obterPerfil(usuario_id) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', usuario_id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao obter perfil:', error)
    return null
  }
}

export async function atualizarPerfil(usuario_id, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', usuario_id)
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return null
  }
}

export async function obterSeguidoresPerfil(usuario_id) {
  try {
    const { data: seguimentos, error } = await supabase
      .from('seguimentos')
      .select('id, seguidor_id, seguido_id, data_criacao')
      .eq('seguido_id', usuario_id)
      .order('data_criacao', { ascending: false })

    if (error) throw error

    const seguidorIds = [...new Set((seguimentos || []).map((item) => item.seguidor_id).filter(Boolean))]
    const { data: perfis, error: perfisError } = seguidorIds.length
      ? await supabase
          .from('public_profiles')
          .select('id, nome, foto_perfil, role, bio')
          .in('id', seguidorIds)
      : { data: [], error: null }

    if (perfisError) throw perfisError

    const perfisMap = new Map((perfis || []).map((perfil) => [perfil.id, perfil]))

    return (seguimentos || []).map((item) => ({
      ...item,
      perfil: perfisMap.get(item.seguidor_id) || null
    }))
  } catch (error) {
    console.error('Erro ao obter seguidores do perfil:', error)
    return []
  }
}

export async function obterPerfilPorEmail(email, excludeUserId = '') {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail) return null

    const { data, error } = await supabase.rpc('buscar_perfil_por_email', {
      p_email: normalizedEmail
    })
    if (error) throw error

    const profile = data?.[0] || null
    if (profile && excludeUserId && profile.id === excludeUserId) return null
    return profile
  } catch (error) {
    console.error('Erro ao obter perfil por email:', error)
    return null
  }
}

export async function obterMensagensUsuario(usuario_id, limite = 20) {
  try {
    const { data: mensagens, error } = await supabase
      .from('mensagens')
      .select('id, remetente_id, destinatario_id, conteudo, data_envio, lido')
      .or(`remetente_id.eq.${usuario_id},destinatario_id.eq.${usuario_id}`)
      .order('data_envio', { ascending: false })
      .limit(limite)

    if (error) throw error

    const profileIds = [...new Set((mensagens || [])
      .flatMap((mensagem) => [mensagem.remetente_id, mensagem.destinatario_id])
      .filter(Boolean))]

    const { data: perfis, error: perfisError } = profileIds.length
      ? await supabase
          .from('public_profiles')
          .select('id, nome, foto_perfil, role')
          .in('id', profileIds)
      : { data: [], error: null }

    if (perfisError) throw perfisError

    const perfisMap = new Map((perfis || []).map((perfil) => [perfil.id, perfil]))

    return (mensagens || []).map((mensagem) => ({
      ...mensagem,
      remetente: perfisMap.get(mensagem.remetente_id) || null,
      destinatario: perfisMap.get(mensagem.destinatario_id) || null
    }))
  } catch (error) {
    console.error('Erro ao obter mensagens do utilizador:', error)
    return []
  }
}

export async function enviarMensagem(remetente_id, destinatario_id, conteudo) {
  try {
    const payload = {
      remetente_id,
      destinatario_id,
      conteudo: String(conteudo || '').trim()
    }

    if (!payload.remetente_id || !payload.destinatario_id || !payload.conteudo) {
      return null
    }

    const { data, error } = await supabase
      .from('mensagens')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return null
  }
}

export async function obterPublicacoesPerfil(usuario_id, role = '') {
  try {
    const [spots, videos] = await Promise.all([
      obterSpots({ criador_id: usuario_id }),
      obterGaleriaVídeosSpots({ autor_id: usuario_id })
    ])
    const eventos = []

    const publicacoes = [
      ...(spots || []).map((spot) => ({
        id: `spot-${spot.id}`,
        tipo: 'Spot',
        titulo: spot.nome || 'Spot',
        descricao: spot.descricao || '',
        destaque: [spot.modalidades?.nome, spot.publico ? 'Público' : 'Privado'].filter(Boolean).join(' / '),
        url: 'mapa.html',
        data: spot.data_criacao || null
      })),
      ...(eventos || []).map((evento) => ({
        id: `evento-${evento.id}`,
        tipo: 'Evento',
        titulo: evento.nome || 'Evento',
        descricao: evento.descricao || '',
        destaque: [evento.modalidade, evento.localidade].filter(Boolean).join(' / '),
        url: 'mapa.html',
        data: evento.data_inicio || evento.data_criacao || null
      })),
      ...(videos || []).map((video) => ({
        id: `video-${video.id}`,
        tipo: 'Vídeo',
        titulo: video.spot?.nome || 'Vídeo de spot',
        descricao: video.legenda || 'Vídeo publicado num spot da comunidade.',
        destaque: [video.spot?.modalidades?.nome, video.spot?.nome].filter(Boolean).join(' / '),
        url: video.spot?.id ? `videos.html?spot=${video.spot.id}` : 'videos.html',
        data: video.data_criacao || null
      }))
    ]

    return publicacoes.sort((first, second) => {
      const firstValue = first.data ? new Date(first.data).getTime() : 0
      const secondValue = second.data ? new Date(second.data).getTime() : 0
      return secondValue - firstValue
    })
  } catch (error) {
    console.error('Erro ao obter publicações do perfil:', error)
    return []
  }
}
const PROFILE_AVATAR_BUCKETS = ['avatars', 'profile-photos', 'profiles']
const PROFILE_AVATAR_MAX_SIZE = 5 * 1024 * 1024
const PROFILE_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function getFileExtension(file) {
  const nameExtension = file?.name?.split('.').pop()?.toLowerCase()
  if (nameExtension) return nameExtension

  const mimeExtension = file?.type?.split('/').pop()?.toLowerCase()
  return mimeExtension || 'jpg'
}

function isBucketMissingError(error) {
  const message = error?.message?.toLowerCase?.() || ''
  return message.includes('bucket') && (message.includes('not found') || message.includes('does not exist'))
}

function extractStoragePath(publicUrl, bucket) {
  if (!publicUrl) return null

  const marker = `/storage/v1/object/public/${bucket}/`
  const markerIndex = publicUrl.indexOf(marker)
  if (markerIndex === -1) return null

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length).split('?')[0])
}

export async function uploadFotoPerfil(usuario_id, file, currentUrl = '') {
  try {
    if (!file) {
      return { url: null, error: 'Seleciona uma imagem antes de guardar.' }
    }

    if (!PROFILE_AVATAR_TYPES.includes(file.type)) {
      return { url: null, error: 'Formato inválido. Usa JPG, PNG, WebP ou GIF.' }
    }

    if (file.size > PROFILE_AVATAR_MAX_SIZE) {
      return { url: null, error: 'A imagem é demasiado grande. Usa um ficheiro até 5 MB.' }
    }

    const extension = getFileExtension(file)
    let lastError = null

    for (const bucket of PROFILE_AVATAR_BUCKETS) {
      const filePath = `${usuario_id}/avatar-${Date.now()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        if (isBucketMissingError(uploadError)) {
          lastError = uploadError
          continue
        }

        return { url: null, error: uploadError.message || 'Não foi possível enviar a imagem.' }
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      const oldPath = extractStoragePath(currentUrl, bucket)

      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from(bucket).remove([oldPath])
      }

      return { url: publicData.publicUrl, bucket, path: filePath, error: null }
    }

    if (lastError) {
      return {
        url: null,
        error: 'Não existe um bucket público para avatars. Cria um bucket "avatars" no Supabase Storage.'
      }
    }

    return { url: null, error: 'Não foi possível enviar a imagem.' }
  } catch (error) {
    console.error('Erro ao fazer upload da foto de perfil:', error)
    return { url: null, error: error.message || 'Erro inesperado ao enviar a foto.' }
  }
}

export async function buscarEventos(termo) {
  try {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .or(`nome.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .eq('ativo', true)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar eventos:', error)
    return []
  }
}

// ============================================================
// 9. FUNÇÕES DE SPOTS
// ============================================================

function isMissingColumnError(error, columnName) {
  const message = error?.message?.toLowerCase?.() || ''
  const normalizedColumn = String(columnName || '').toLowerCase()
  return error?.code === '42703'
    || (message.includes(normalizedColumn) && message.includes('does not exist'))
    || (message.includes(normalizedColumn) && message.includes('could not find'))
}

function isMissingRelationError(error, relationName) {
  const message = error?.message?.toLowerCase?.() || ''
  const normalizedRelation = String(relationName || '').toLowerCase()
  return error?.code === 'PGRST205'
    || error?.code === '42P01'
    || (message.includes(normalizedRelation) && message.includes('does not exist'))
}

function buildSpotsBaseSelect(includeVideoUrl = true, includeBestSeason = true) {
  return `
      id,
      nome,
      descricao,
      ${includeVideoUrl ? 'video_url,' : ''}
      coordenadas_lat,
      coordenadas_long,
      criador_id,
      modalidade_id,
      categoria_id,
      dificuldade,
      ${includeBestSeason ? 'melhor_epoca_meses,' : ''}
      ${includeBestSeason ? 'melhor_epoca_notas,' : ''}
      publico,
      data_criacao,
      ativo
    `
}

function removeMissingSpotColumns(payload, error) {
  const fallbackPayload = { ...payload }
  let changed = false

  if (isMissingColumnError(error, 'video_url')) {
    delete fallbackPayload.video_url
    changed = true
  }

  if (isMissingColumnError(error, 'dificuldade')) {
    delete fallbackPayload.dificuldade
    changed = true
  }

  if (
    isMissingColumnError(error, 'melhor_epoca_meses')
    || isMissingColumnError(error, 'melhor_epoca_notas')
  ) {
    delete fallbackPayload.melhor_epoca_meses
    delete fallbackPayload.melhor_epoca_notas
    changed = true
  }

  return changed ? fallbackPayload : null
}

export async function obterSpots(filtros = {}) {
  try {
    const aplicarFiltros = (query) => {
      if (filtros.modalidade_id && filtros.modalidade_id !== 'all') {
        query = query.eq('modalidade_id', parseInt(filtros.modalidade_id))
      }
      if (filtros.categoria_id && filtros.categoria_id !== 'all') {
        query = query.eq('categoria_id', parseInt(filtros.categoria_id))
      }
      if (Array.isArray(filtros.ids) && filtros.ids.length) {
        query = query.in('id', filtros.ids)
      }
      if (filtros.criador_id) {
        query = query.eq('criador_id', filtros.criador_id)
      }
      return query
    }

    const runSpotsQuery = (includeVideoUrl, includeBestSeason) => {
      let query = supabase
        .from('spots')
        .select(buildSpotsBaseSelect(includeVideoUrl, includeBestSeason))
        .order('data_criacao', { ascending: false })

      if (!filtros.includeInactive) query = query.eq('ativo', true)

      return aplicarFiltros(query)
    }

    // The active Supabase schema used by the static site still lacks
    // spots.video_url, so we avoid the initial 400 on every map load.
    let includeVideoUrl = false
    let includeBestSeason = true
    let { data, error } = await runSpotsQuery(includeVideoUrl, includeBestSeason)

    if (error && isMissingColumnError(error, 'video_url')) {
      includeVideoUrl = false
      console.warn('A coluna spots.video_url ainda não existe na base ativa. A carregar spots sem esse campo.')
      ;({ data, error } = await runSpotsQuery(includeVideoUrl, includeBestSeason))
    }

    if (error && (
      isMissingColumnError(error, 'melhor_epoca_meses')
      || isMissingColumnError(error, 'melhor_epoca_notas')
    )) {
      includeBestSeason = false
      console.warn('As colunas de melhor epoca ainda não existem na base ativa. A carregar spots sem esse campo.')
      ;({ data, error } = await runSpotsQuery(includeVideoUrl, includeBestSeason))
    }

    if (error) {
      console.error('Erro na query de spots:', error)
      throw error
    }

    const spots = (data || []).map((spot) => ({
      ...spot,
      dificuldade: spot.dificuldade || 'facil',
      video_url: includeVideoUrl ? spot.video_url || null : null,
      melhor_epoca_meses: includeBestSeason ? spot.melhor_epoca_meses || [] : [],
      melhor_epoca_notas: includeBestSeason ? spot.melhor_epoca_notas || null : null
    }))
    if (!spots.length) return []

    const modalidadeIds = [...new Set(spots.map((spot) => spot.modalidade_id).filter(Boolean))]
    const categoriaIds = [...new Set(spots.map((spot) => spot.categoria_id).filter(Boolean))]
    const criadorIds = [...new Set(spots.map((spot) => spot.criador_id).filter(Boolean))]

    const [modalidadesRes, categoriasRes, perfisRes] = await Promise.all([
      modalidadeIds.length
        ? supabase.from('modalidades').select('id, nome').in('id', modalidadeIds)
        : Promise.resolve({ data: [], error: null }),
      categoriaIds.length
        ? supabase.from('categorias').select('id, nome').in('id', categoriaIds)
        : Promise.resolve({ data: [], error: null }),
      criadorIds.length
        ? supabase.from('public_profiles').select('id, nome, role').in('id', criadorIds)
        : Promise.resolve({ data: [], error: null })
    ])

    if (modalidadesRes.error) console.warn('Erro ao obter modalidades dos spots:', modalidadesRes.error)
    if (categoriasRes.error) console.warn('Erro ao obter categorias dos spots:', categoriasRes.error)
    if (perfisRes.error) console.warn('Erro ao obter perfis dos spots:', perfisRes.error)

    const modalidadeMap = new Map((modalidadesRes.data || []).map((modalidade) => [modalidade.id, modalidade]))
    const categoriaMap = new Map((categoriasRes.data || []).map((categoria) => [categoria.id, categoria]))
    const perfilMap = new Map((perfisRes.data || []).map((perfil) => [perfil.id, perfil]))

    return spots.map((spot) => ({
      ...spot,
      video_url: spot.video_url || null,
      melhor_epoca_meses: spot.melhor_epoca_meses || [],
      melhor_epoca_notas: spot.melhor_epoca_notas || null,
      modalidades: modalidadeMap.get(spot.modalidade_id) || null,
      categorias: categoriaMap.get(spot.categoria_id) || null,
      profiles: perfilMap.get(spot.criador_id) || null
    }))
  } catch (error) {
    console.error('Erro ao obter spots:', error)
    return []
  }
}

export async function criarSpot(spotData) {
  try {
    let payload = { ...spotData }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from('spots')
        .insert([payload])
        .select()
        .single()

      if (!error) return data

      const fallbackPayload = removeMissingSpotColumns(payload, error)
      if (!fallbackPayload) throw error
      payload = fallbackPayload
    }

    throw new Error('Não foi possível criar o spot com o esquema atual.')
  } catch (error) {
    console.error('Erro ao criar spot:', error)
    return null
  }
}

async function hydrateSpotVídeos(items = []) {
  const spotIds = [...new Set((items || []).map((item) => item.spot_id).filter(Boolean))]
  const autorIds = [...new Set((items || []).map((item) => item.autor_id).filter(Boolean))]

  const [spots, autoresRes] = await Promise.all([
    spotIds.length ? obterSpots({ ids: spotIds }) : Promise.resolve([]),
    autorIds.length
      ? supabase.from('public_profiles').select('id, nome, foto_perfil, role').in('id', autorIds)
      : Promise.resolve({ data: [], error: null })
  ])

  if (autoresRes.error) throw autoresRes.error

  const spotMap = new Map((spots || []).map((spot) => [spot.id, spot]))
  const autorMap = new Map((autoresRes.data || []).map((perfil) => [perfil.id, perfil]))

  return (items || []).map((item) => ({
    ...item,
    spot: spotMap.get(item.spot_id) || null,
    autor: autorMap.get(item.autor_id) || null
  }))
}

async function obterVídeosSpotsLegacy(filtros = {}) {
  const spots = await obterSpots({
    ids: filtros.spot_ids,
    criador_id: filtros.autor_id
  })

  return (spots || [])
    .filter((spot) => {
      if (!spot.video_url) return false
      if (filtros.spot_id && Number(spot.id) !== Number(filtros.spot_id)) return false
      if (filtros.modalidade_id && filtros.modalidade_id !== 'all' && Number(spot.modalidade_id) !== Number(filtros.modalidade_id)) return false
      return true
    })
    .map((spot) => ({
      id: `legacy-${spot.id}`,
      spot_id: spot.id,
      autor_id: spot.criador_id,
      video_url: spot.video_url,
      legenda: spot.descricao || '',
      data_criacao: spot.data_criacao || null,
      ativo: true,
      spot,
      autor: spot.profiles || null
    }))
}

const LOCAL_SPOT_VIDEOS_KEY = 'boardsports.local-spot-videos'

function readLocalSpotVídeos() {
  try {
    const raw = window.localStorage.getItem(LOCAL_SPOT_VIDEOS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Não foi possível ler vídeos locais dos spots:', error)
    return []
  }
}

function writeLocalSpotVídeos(items = []) {
  try {
    window.localStorage.setItem(LOCAL_SPOT_VIDEOS_KEY, JSON.stringify(items))
    return true
  } catch (error) {
    console.warn('Não foi possível guardar vídeos locais dos spots:', error)
    return false
  }
}

function filterSpotVideoItems(items = [], filtros = {}) {
  return (items || []).filter((item) => {
    if (!item?.ativo) return false
    if (filtros.spot_id && Number(item.spot_id) !== Number(filtros.spot_id)) return false
    if (Array.isArray(filtros.spot_ids) && filtros.spot_ids.length && !filtros.spot_ids.map(Number).includes(Number(item.spot_id))) return false
    if (filtros.autor_id && String(item.autor_id) !== String(filtros.autor_id)) return false
    return true
  })
}

async function obterVídeosSpotsLocal(filtros = {}) {
  const items = filterSpotVideoItems(readLocalSpotVídeos(), filtros)
  return hydrateSpotVídeos(items)
}

function guardarVideoSpotLocal(payload) {
  const nextItem = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    spot_id: payload.spot_id,
    autor_id: payload.autor_id,
    video_url: payload.video_url,
    legenda: payload.legenda || null,
    formato: payload.formato || 'long',
    plataforma: payload.plataforma || null,
    tipo_autoria: payload.tipo_autoria || 'proprio',
    xp_video: Number(payload.xp_video || 0),
    analise_score: payload.analise_score || 0,
    analise_resultado: payload.analise_resultado || {},
    data_criacao: new Date().toISOString(),
    ativo: true
  }

  const currentItems = readLocalSpotVídeos()
  currentItems.unshift(nextItem)
  return writeLocalSpotVídeos(currentItems) ? nextItem : null
}

export function analisarVideoUrl(url = '') {
  const raw = String(url || '').trim()
  const lower = raw.toLowerCase()
  const result = {
    url: raw,
    plataforma: 'link',
    formato: 'long',
    orientacao: 'horizontal',
    score: 42,
    avisos: [],
    sugestoes: []
  }

  if (!raw) {
    return {
      ...result,
      score: 0,
      avisos: ['URL vazio.']
    }
  }

  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be' || host.includes('youtube.com')) {
      result.plataforma = 'youtube'
      result.score += 22
    } else if (host.includes('tiktok.com')) {
      result.plataforma = 'tiktok'
      result.score += 24
    } else if (host.includes('instagram.com')) {
      result.plataforma = 'instagram'
      result.score += 18
    } else if (host.includes('vimeo.com')) {
      result.plataforma = 'vimeo'
      result.score += 18
    } else if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(raw)) {
      result.plataforma = 'ficheiro'
      result.score += 20
    } else {
      result.avisos.push('Plataforma sem embed garantido.')
      result.sugestoes.push('Usa YouTube, TikTok, Vimeo ou um ficheiro MP4/WebM para melhor compatibilidade.')
    }

    if (
      lower.includes('/shorts/')
      || lower.includes('tiktok.com')
      || lower.includes('/reel/')
      || lower.includes('/reels/')
    ) {
      result.formato = 'short'
      result.orientacao = 'vertical'
      result.score += 22
      result.sugestoes.push('Este vídeo entra no feed de curtos verticais.')
    } else {
      result.formato = 'long'
      result.orientacao = 'horizontal'
      result.score += 14
      result.sugestoes.push('Este vídeo entra na grelha de vídeos longos horizontais.')
    }

    if (parsed.protocol !== 'https:') {
      result.score -= 18
      result.avisos.push('O link não usa HTTPS.')
    }
  } catch (error) {
    result.score = 15
    result.avisos.push('URL inválido ou incompleto.')
    result.sugestoes.push('Cola um link completo, por exemplo https://youtube.com/...')
  }

  result.score = Math.max(0, Math.min(100, Math.round(result.score)))
  if (result.score >= 80) result.qualidade = 'Boa'
  else if (result.score >= 55) result.qualidade = 'Média'
  else result.qualidade = 'Baixa'

  return result
}

export async function obterGaleriaVídeosSpots(filtros = {}) {
  try {
    const buildQuery = (selectColumns) => {
      let query = supabase
      .from('spot_videos')
        .select(selectColumns)
      .eq('ativo', true)
      .order('data_criacao', { ascending: false })

      if (filtros.spot_id) {
        query = query.eq('spot_id', filtros.spot_id)
      }

      if (Array.isArray(filtros.spot_ids) && filtros.spot_ids.length) {
        query = query.in('spot_id', filtros.spot_ids)
      }

      if (filtros.autor_id) {
        query = query.eq('autor_id', filtros.autor_id)
      }

      return query
    }

    const fullSelect = 'id, spot_id, autor_id, video_url, legenda, formato, plataforma, tipo_autoria, xp_video, analise_score, analise_resultado, data_criacao, ativo'
    const baseSelect = 'id, spot_id, autor_id, video_url, legenda, formato, plataforma, analise_score, analise_resultado, data_criacao, ativo'
    let { data, error } = await buildQuery(fullSelect)

    if (error && (
      isMissingColumnError(error, 'tipo_autoria')
      || isMissingColumnError(error, 'xp_video')
    )) {
      const retry = await buildQuery(baseSelect)
      data = retry.data
      error = retry.error
    }

    if (error && (
      isMissingRelationError(error, 'spot_videos')
      || isMissingColumnError(error, 'formato')
      || isMissingColumnError(error, 'plataforma')
      || isMissingColumnError(error, 'tipo_autoria')
      || isMissingColumnError(error, 'xp_video')
      || isMissingColumnError(error, 'analise_score')
      || isMissingColumnError(error, 'analise_resultado')
    )) {
      const [legacyItems, localItems] = await Promise.all([
        obterVídeosSpotsLegacy(filtros),
        obterVídeosSpotsLocal(filtros)
      ])

      return [...localItems, ...legacyItems].sort((first, second) => {
        const firstValue = first?.data_criacao ? new Date(first.data_criacao).getTime() : 0
        const secondValue = second?.data_criacao ? new Date(second.data_criacao).getTime() : 0
        return secondValue - firstValue
      })
    }

    if (error) throw error
    return hydrateSpotVídeos(data || [])
  } catch (error) {
    console.error('Erro ao obter galeria de vídeos dos spots:', error)
    return []
  }
}

function getVideoAuthoringXp(tipoAutoria = 'proprio') {
  const xpByType = {
    proprio: 40,
    filmado: 20,
    terceiros: 0
  }

  return xpByType[tipoAutoria] ?? xpByType.proprio
}

export async function publicarVideoSpot({ spot_id, autor_id, video_url, legenda = '', tipo_autoria = 'proprio' }) {
  try {
    const analysis = analisarVideoUrl(video_url)
    const normalizedAuthoring = ['proprio', 'filmado', 'terceiros'].includes(tipo_autoria)
      ? tipo_autoria
      : 'proprio'
    const payload = {
      spot_id,
      autor_id,
      video_url: String(video_url || '').trim(),
      legenda: String(legenda || '').trim() || null,
      formato: analysis.formato,
      plataforma: analysis.plataforma,
      tipo_autoria: normalizedAuthoring,
      xp_video: getVideoAuthoringXp(normalizedAuthoring),
      analise_score: analysis.score,
      analise_resultado: analysis
    }

    if (!payload.spot_id || !payload.autor_id || !payload.video_url) {
      return { sucesso: false, erro: 'Preenche o URL do vídeo antes de publicar.' }
    }

    const { data, error } = await supabase
      .from('spot_videos')
      .insert([payload])
      .select()
      .single()

    if (error && isMissingRelationError(error, 'spot_videos')) {
      const localItem = guardarVideoSpotLocal(payload)
      if (!localItem) {
        return {
          sucesso: false,
          erro: 'A base ativa ainda não suporta a tabela de vídeos e o fallback local também falhou neste browser.'
        }
      }

      return {
        sucesso: true,
        data: localItem,
        modoFallback: 'local'
      }
    }

    if (error && (
      isMissingColumnError(error, 'formato')
      || isMissingColumnError(error, 'plataforma')
      || isMissingColumnError(error, 'tipo_autoria')
      || isMissingColumnError(error, 'xp_video')
      || isMissingColumnError(error, 'analise_score')
      || isMissingColumnError(error, 'analise_resultado')
    )) {
      const fallbackPayload = { ...payload }
      delete fallbackPayload.formato
      delete fallbackPayload.plataforma
      delete fallbackPayload.tipo_autoria
      delete fallbackPayload.xp_video
      delete fallbackPayload.analise_score
      delete fallbackPayload.analise_resultado

      const retry = await supabase
        .from('spot_videos')
        .insert([fallbackPayload])
        .select()
        .single()

      if (retry.error) throw retry.error
      return { sucesso: true, data: retry.data }
    }

    if (error) throw error
    return { sucesso: true, data }
  } catch (error) {
    console.error('Erro ao publicar vídeo no spot:', error)

    const rawMessage = error.message || ''
    if (rawMessage.toLowerCase().includes('row-level security')) {
      return {
        sucesso: false,
        erro: 'A base de dados bloqueou a publicação por permissão. Termina sessão, volta a entrar e tenta novamente.'
      }
    }

    return { sucesso: false, erro: error.message || 'Não foi possível publicar o vídeo neste spot.' }
  }
}

export async function apagarVideoSpot(id) {
  try {
    if (!id) return false

    if (String(id).startsWith('local-')) {
      const nextItems = readLocalSpotVídeos().filter((item) => String(item.id) !== String(id))
      return writeLocalSpotVídeos(nextItems)
    }

    const { error } = await supabase
      .from('spot_videos')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao apagar vídeo do spot:', error)
    return false
  }
}

export async function criarSolicitacaoPublicacao(spot_id, usuario_id) {
  try {
    const { data, error } = await supabase
      .from('solicitacoes_publicacao')
      .insert([{ spot_id, usuario_id }])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao criar solicitação de publicação:', error)
    return null
  }
}

export async function obterSolicitacoesPublicacao(filtros = {}) {
  try {
    let query = supabase
      .from('solicitacoes_publicacao')
      .select('id, spot_id, usuario_id, status, mensagem_admin, data_criacao, data_decisao')
      .order('data_criacao', { ascending: false })

    if (filtros.status) {
      query = query.eq('status', filtros.status)
    }

    const { data: solicitacoes, error } = await query
    if (error) throw error

    const spotIds = [...new Set((solicitacoes || []).map((item) => item.spot_id).filter(Boolean))]
    const usuarioIds = [...new Set((solicitacoes || []).map((item) => item.usuario_id).filter(Boolean))]

    const [spots, perfisRes] = await Promise.all([
      spotIds.length ? obterSpots({ ids: spotIds }) : Promise.resolve([]),
      usuarioIds.length
        ? supabase.from('public_profiles').select('id, nome').in('id', usuarioIds)
        : Promise.resolve({ data: [], error: null })
    ])

    if (perfisRes.error) throw perfisRes.error

    const spotMap = new Map(spots.map((spot) => [spot.id, spot]))
    const perfilMap = new Map((perfisRes.data || []).map((perfil) => [perfil.id, perfil]))

    return (solicitacoes || []).map((solicitacao) => ({
      ...solicitacao,
      spot: spotMap.get(solicitacao.spot_id) || null,
      usuario: perfilMap.get(solicitacao.usuario_id) || null
    }))
  } catch (error) {
    console.error('Erro ao obter solicitações de publicação:', error)
    return []
  }
}

export async function moderarSolicitacaoPublicacao(solicitacao_id, status, mensagem_admin = '') {
  try {
    const { data, error } = await supabase.rpc('moderar_solicitacao_publicacao', {
      p_solicitacao_id: solicitacao_id,
      p_status: status,
      p_mensagem_admin: mensagem_admin || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao moderar solicitação de publicação:', error)
    return null
  }
}

export async function obterCategoriasPorModalidade(modalidade_id) {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('modalidade_id', modalidade_id)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter categorias:', error)
    return []
  }
}

// ============================================================
// OPERAÇÕES CRUD PARA SPOTS - UPDATE e DELETE
// ============================================================

export async function atualizarSpot(id, updates) {
  try {
    const payload = {
      nome: updates.nome,
      descricao: updates.descricao,
      video_url: updates.video_url,
      modalidade_id: updates.modalidade_id,
      categoria_id: updates.categoria_id,
      dificuldade: updates.dificuldade || 'facil',
      melhor_epoca_meses: updates.melhor_epoca_meses || [],
      melhor_epoca_notas: updates.melhor_epoca_notas || null,
      coordenadas_lat: updates.coordenadas_lat,
      coordenadas_long: updates.coordenadas_long,
      data_atualizacao: new Date().toISOString()
    }

    let currentPayload = payload

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from('spots')
        .update(currentPayload)
        .eq('id', id)
        .select()
        .single()

      if (!error) return data

      const fallbackPayload = removeMissingSpotColumns(currentPayload, error)
      if (!fallbackPayload) throw error
      currentPayload = fallbackPayload
    }

    throw new Error('Não foi possível atualizar o spot com o esquema atual.')
  } catch (error) {
    console.error('Erro ao atualizar spot:', error)
    return null
  }
}

export async function apagarSpot(id) {
  try {
    const { error } = await supabase
      .from('spots')
      .update({
        ativo: false,
        publico: false,
        data_atualizacao: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao apagar spot:', error)
    return false
  }
}

// ============================================================
// COMMUNITY FEATURES: notificações, comentários, favoritos,
// imagens, denúncias, pesquisa, recomendações e estatísticas
// ============================================================

export async function obterNotificacoes({ apenasNaoLidas = false } = {}) {
  try {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return []

    let query = supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', userId)
      .order('data_criacao', { ascending: false })
      .limit(80)

    if (apenasNaoLidas) query = query.eq('lida', false)

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter notificações:', error)
    return []
  }
}

export async function marcarNotificacaoLida(id) {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao marcar notificação:', error)
    return false
  }
}

export async function obterComentarios(entidade_tipo, entidade_id) {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .select('id, entidade_tipo, entidade_id, user_id, conteudo, data_criacao, profiles(nome, email, foto_perfil)')
      .eq('entidade_tipo', entidade_tipo)
      .eq('entidade_id', String(entidade_id))
      .eq('ativo', true)
      .order('data_criacao', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter comentários:', error)
    return []
  }
}

export async function criarComentario({ entidade_tipo, entidade_id, user_id, conteudo }) {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .insert([{
        entidade_tipo,
        entidade_id: String(entidade_id),
        user_id,
        conteudo: String(conteudo || '').trim()
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar comentário:', error)
    return null
  }
}

export async function apagarComentario(id) {
  try {
    const { error } = await supabase
      .from('comentarios')
      .update({ ativo: false })
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao apagar comentário:', error)
    return false
  }
}

export async function obterFavoritos(userId) {
  try {
    if (!userId) return []

    const { data, error } = await supabase
      .from('spot_favoritos')
      .select('spot_id, data_criacao')
      .eq('user_id', userId)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter favoritos:', error)
    return []
  }
}

export async function alternarFavoritoSpot(userId, spotId, isFavorite) {
  try {
    if (!userId || !spotId) return false

    if (isFavorite) {
      const { error } = await supabase
        .from('spot_favoritos')
        .delete()
        .eq('user_id', userId)
        .eq('spot_id', spotId)

      if (error) throw error
      return false
    }

    const { error } = await supabase
      .from('spot_favoritos')
      .upsert({ user_id: userId, spot_id: spotId }, { onConflict: 'user_id,spot_id' })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao alternar favorito:', error)
    return isFavorite
  }
}

export async function obterImagensSpot(spotId) {
  try {
    const { data, error } = await supabase
      .from('spot_imagens')
      .select('id, spot_id, user_id, image_url, storage_path, legenda, data_criacao, profiles(nome, email)')
      .eq('spot_id', spotId)
      .eq('ativo', true)
      .order('data_criacao', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter imagens do spot:', error)
    return []
  }
}

export async function enviarImagemSpot({ spotId, userId, file, legenda = '' }) {
  try {
    if (!spotId || !userId || !file) return null

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const storagePath = `${userId}/${spotId}/${safeName}`

    const upload = await supabase.storage
      .from('spot-images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (upload.error) throw upload.error

    const { data: publicData } = supabase.storage.from('spot-images').getPublicUrl(storagePath)

    const { data, error } = await supabase
      .from('spot_imagens')
      .insert([{
        spot_id: spotId,
        user_id: userId,
        image_url: publicData.publicUrl,
        storage_path: storagePath,
        legenda: String(legenda || '').trim() || null
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao enviar imagem do spot:', error)
    return null
  }
}

export async function criarDenuncia({ entidade_tipo, entidade_id, denunciante_id, motivo, detalhe = '' }) {
  try {
    const payload = {
      entidade_tipo,
      entidade_id: String(entidade_id),
      denunciante_id,
      user_id: denunciante_id,
      motivo: String(motivo || '').trim(),
      detalhe: String(detalhe || '').trim() || null
    }

    if (!payload.entidade_tipo || !payload.entidade_id || !payload.denunciante_id || !payload.motivo) {
      return null
    }

    const ignoredMissingColumns = new Set()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const insertPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => !ignoredMissingColumns.has(key))
      )

      const { data, error } = await supabase
        .from('denuncias')
        .insert([insertPayload])
        .select()
        .single()

      if (!error) return data

      if (isMissingColumnError(error, 'user_id')) {
        ignoredMissingColumns.add('user_id')
        continue
      }

      if (isMissingColumnError(error, 'detalhe')) {
        ignoredMissingColumns.add('detalhe')
        continue
      }

      throw error
    }

    return null
  } catch (error) {
    console.error('Erro ao criar denúncia:', error)
    return null
  }
}

export async function obterDenunciasModeracao({ estado = 'pendente' } = {}) {
  try {
    let query = supabase
      .from('denuncias')
      .select('id, entidade_tipo, entidade_id, denunciante_id, motivo, detalhe, estado, nota_admin, data_criacao, denunciante:profiles!denuncias_denunciante_id_fkey(nome, email)')
      .order('data_criacao', { ascending: false })

    if (estado && estado !== 'todos') query = query.eq('estado', estado)

    const { data, error } = await query
    if (error) throw error

    const reports = (data || []).map((item) => ({
      ...item,
      profiles: item.denunciante || null
    }))

    const spotIds = [...new Set(reports
      .filter((item) => item.entidade_tipo === 'spot')
      .map((item) => Number(item.entidade_id))
      .filter(Number.isFinite))]
    const userIds = [...new Set(reports
      .filter((item) => item.entidade_tipo === 'user')
      .map((item) => item.entidade_id)
      .filter(Boolean))]

    const [spots, usersRes] = await Promise.all([
      spotIds.length ? obterSpots({ ids: spotIds, includeInactive: true }) : Promise.resolve([]),
      userIds.length
        ? supabase.from('public_profiles').select('id, nome, role, foto_perfil').in('id', userIds)
        : Promise.resolve({ data: [], error: null })
    ])

    if (usersRes.error) console.warn('Erro ao obter utilizadores denunciados:', usersRes.error)

    const spotMap = new Map((spots || []).map((spot) => [String(spot.id), spot]))
    const userMap = new Map((usersRes.data || []).map((profile) => [String(profile.id), profile]))

    return reports.map((item) => ({
      ...item,
      entidade: item.entidade_tipo === 'spot'
        ? spotMap.get(String(item.entidade_id)) || null
        : item.entidade_tipo === 'user'
          ? userMap.get(String(item.entidade_id)) || null
          : null
    }))
  } catch (error) {
    console.error('Erro ao obter denúncias:', error)
    return []
  }
}

export async function moderarDenuncia(id, estado, nota = '') {
  try {
    const { data, error } = await supabase.rpc('moderar_denuncia', {
      p_denuncia_id: id,
      p_estado: estado,
      p_nota_admin: nota || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao moderar denúncia:', error)
    return null
  }
}

export async function excluirSpotModeracao({ spotId, denunciaId = null, nota = '' }) {
  try {
    const { data, error } = await supabase.rpc('admin_excluir_spot', {
      p_spot_id: Number(spotId),
      p_denuncia_id: denunciaId ? Number(denunciaId) : null,
      p_nota_admin: nota || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao excluir spot por moderação:', error)
    return null
  }
}

export async function banirUsuarioModeracao({ userId, denunciaId = null, nota = '' }) {
  try {
    const { data, error } = await supabase.rpc('admin_banir_user', {
      p_user_id: userId,
      p_denuncia_id: denunciaId ? Number(denunciaId) : null,
      p_nota_admin: nota || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao banir utilizador por moderação:', error)
    return null
  }
}

export async function aplicarTimeoutUsuarioModeracao({ userId, timeoutUntil, denunciaId = null, nota = '' }) {
  try {
    const { data, error } = await supabase.rpc('admin_timeout_user', {
      p_user_id: userId,
      p_timeout_until: timeoutUntil,
      p_denuncia_id: denunciaId ? Number(denunciaId) : null,
      p_nota_admin: nota || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao aplicar timeout por moderação:', error)
    return null
  }
}

export async function obterEstatisticasSpot(spotId) {
  try {
    const { data, error } = await supabase.rpc('spot_estatisticas', { p_spot_id: Number(spotId) })
    if (error) throw error
    return data || {}
  } catch (error) {
    console.error('Erro ao obter estatísticas do spot:', error)
    return {}
  }
}

export async function obterEstatisticasUser(userId) {
  try {
    if (!userId) return {}
    const { data, error } = await supabase.rpc('user_estatisticas', { p_user_id: userId })
    if (error) throw error
    return data || {}
  } catch (error) {
    console.error('Erro ao obter estatísticas do utilizador:', error)
    return {}
  }
}

export async function pesquisarGlobal(termo) {
  const search = String(termo || '').trim()
  if (!search) return []

  const normalized = search.toLowerCase()
  const [spots, videos, profilesRes] = await Promise.all([
    obterSpots(),
    obterGaleriaVídeosSpots(),
    supabase
      .from('public_profiles')
      .select('id, nome, role, foto_perfil')
      .ilike('nome', `%${search}%`)
      .eq('ativo', true)
      .limit(20)
  ])

  const spotResults = spots
    .filter((spot) => [
      spot.nome,
      spot.descricao,
      spot.modalidades?.nome,
      spot.categorias?.nome,
      spot.profiles?.nome
    ].filter(Boolean).join(' ').toLowerCase().includes(normalized))
    .slice(0, 20)
    .map((spot) => ({
      type: 'spot',
      title: spot.nome,
      description: [spot.modalidades?.nome, spot.categorias?.nome].filter(Boolean).join(' / '),
      href: `/spot.html?id=${spot.id}`
    }))

  const videoResults = videos
    .filter((video) => [
      video.legenda,
      video.spot?.nome,
      video.spot?.modalidades?.nome,
      video.autor?.nome
    ].filter(Boolean).join(' ').toLowerCase().includes(normalized))
    .slice(0, 20)
    .map((video) => ({
      type: 'video',
      title: video.legenda || `Video em ${video.spot?.nome || 'spot'}`,
      description: video.spot?.nome || video.video_url,
      href: video.spot_id ? `/spot.html?id=${video.spot_id}#video-${video.id}` : '/videos.html'
    }))

  const profileResults = (profilesRes.data || []).map((perfil) => ({
    type: 'user',
    title: perfil.nome || perfil.email || 'Utilizador',
    description: perfil.role || 'perfil',
    href: `/perfil.html?user=${perfil.id}`
  }))

  return [...spotResults, ...videoResults, ...profileResults]
}

function distanceKm(first, second) {
  const lat1 = Number(first?.coordenadas_lat)
  const lon1 = Number(first?.coordenadas_long)
  const lat2 = Number(second?.coordenadas_lat)
  const lon2 = Number(second?.coordenadas_long)
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY

  const toRad = (value) => value * Math.PI / 180
  const earthKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function obterRecomendacoesSpots(baseSpot, limit = 4) {
  const spots = await obterSpots()
  return spots
    .filter((spot) => Number(spot.id) !== Number(baseSpot?.id))
    .map((spot) => ({
      ...spot,
      score: (Number(spot.modalidade_id) === Number(baseSpot?.modalidade_id) ? 100 : 0) - distanceKm(baseSpot, spot),
      distancia_km: distanceKm(baseSpot, spot)
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
}

export async function obterCondicoesSpot(spot) {
  const lat = Number(spot?.coordenadas_lat)
  const lng = Number(spot?.coordenadas_long)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { weather: null, marine: null }

  const sport = String(spot?.modalidades?.nome || '').toLowerCase()
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast')
  weatherUrl.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,wind_speed_10m,precipitation',
    daily: 'snowfall_sum,snow_depth_max',
    timezone: 'auto',
    forecast_days: '3'
  }).toString()

  const needsMarine = sport.includes('surf') || sport.includes('skim')
  const marineUrl = new URL('https://marine-api.open-meteo.com/v1/marine')
  marineUrl.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'wave_height,wave_period,sea_level_height_msl',
    timezone: 'auto'
  }).toString()

  try {
    const [weatherRes, marineRes] = await Promise.all([
      fetch(weatherUrl).then((response) => response.ok ? response.json() : null),
      needsMarine ? fetch(marineUrl).then((response) => response.ok ? response.json() : null) : Promise.resolve(null)
    ])

    return { weather: weatherRes, marine: marineRes }
  } catch (error) {
    console.error('Erro ao obter condições externas:', error)
    return { weather: null, marine: null }
  }
}

// ============================================================
// 10. BOARDSports XP SYSTEM
// ============================================================

export const XP_LEVELS = [
  { level: 1, name: 'Rookie Rider', xp: 0, tipo_user: 'principiante' },
  { level: 2, name: 'Street Starter', xp: 250, tipo_user: 'principiante' },
  { level: 3, name: 'Local Shredder', xp: 600, tipo_user: 'principiante' },
  { level: 4, name: 'Flow Rider', xp: 1000, tipo_user: 'intermedio' },
  { level: 5, name: 'Trick Hunter', xp: 1600, tipo_user: 'intermedio' },
  { level: 6, name: 'Spot Explorer', xp: 2400, tipo_user: 'intermedio' },
  { level: 7, name: 'Combo Maker', xp: 3500, tipo_user: 'intermedio' },
  { level: 8, name: 'Style Master', xp: 5000, tipo_user: 'pro' },
  { level: 9, name: 'Elite Rider', xp: 7500, tipo_user: 'pro' },
  { level: 10, name: 'BoardSports Legend', xp: 10000, tipo_user: 'pro' }
]

export const XP_SOURCES = {
  spot_facil: 50,
  spot_medio: 120,
  spot_dificil: 250,
  checkin_diario: 20,
  video_diario: 40,
  spot_diario: 60,
  manobra_facil: 25,
  manobra_media: 75,
  manobra_dificil: 150,
  novo_spot_aprovado: 100,
  like: 2,
  destaque_admin: 300
}

export const DAILY_ACHIEVEMENTS = [
  {
    codigo: 'checkin_diario',
    titulo: 'Check-in diario',
    descricao: 'Entra no mapa uma vez por dia.',
    xp: XP_SOURCES.checkin_diario
  },
  {
    codigo: 'spot_diario',
    titulo: 'Spot do dia',
    descricao: 'Cria pelo menos um spot hoje.',
    xp: XP_SOURCES.spot_diario
  },
  {
    codigo: 'video_diario',
    titulo: 'Video do dia',
    descricao: 'Publica pelo menos um vídeo num spot hoje.',
    xp: XP_SOURCES.video_diario
  }
]

function getLevelForXp(xpValue = 0) {
  const xp = Number(xpValue || 0)
  return [...XP_LEVELS].reverse().find((level) => xp >= level.xp) || XP_LEVELS[0]
}

export function obterResumoXp(perfil = {}) {
  const xpTotal = Number(perfil?.xp_total || 0)
  const currentLevel = getLevelForXp(xpTotal)
  const nextLevel = XP_LEVELS.find((level) => level.level === currentLevel.level + 1) || null
  const currentFloor = currentLevel.xp
  const nextFloor = nextLevel?.xp ?? currentFloor
  const progress = nextLevel
    ? Math.max(0, Math.min(100, Math.round(((xpTotal - currentFloor) / (nextFloor - currentFloor)) * 100)))
    : 100

  return {
    xp_total: xpTotal,
    nivel_xp: currentLevel.level,
    nivel_nome: currentLevel.name,
    tipo_user: currentLevel.tipo_user,
    proximo_nivel: nextLevel,
    xp_para_proximo: nextLevel ? Math.max(0, nextLevel.xp - xpTotal) : 0,
    progresso_percentagem: progress
  }
}

export function calcularComboXp(manobras = []) {
  const baseXp = (manobras || []).reduce((total, manobra) => total + Number(manobra?.xp || 0), 0)
  const count = manobras.length
  const multiplier = count >= 5 ? 3 : count === 4 ? 2 : count === 3 ? 1.5 : count === 2 ? 1.2 : 1
  return {
    base_xp: baseXp,
    multiplicador: multiplier,
    xp_total: Math.round(baseXp * multiplier)
  }
}

export async function obterLeaderboardXp(filtro = 'global', modalidadeId = null) {
  try {
    if (filtro === 'semanal' || filtro === 'mensal') {
      const start = new Date()
      if (filtro === 'semanal') {
        start.setDate(start.getDate() - 7)
      } else {
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
      }

      let query = supabase
        .from('xp_logs')
        .select('user_id, xp_ganho, data_registo')
        .gte('data_registo', start.toISOString())

      const { data: logs, error } = await query
      if (error) throw error

      const totals = new Map()
      ;(logs || []).forEach((log) => {
        totals.set(log.user_id, (totals.get(log.user_id) || 0) + Number(log.xp_ganho || 0))
      })

      const ids = [...totals.keys()]
      if (!ids.length) return []

      const { data: profiles, error: profilesError } = await supabase
        .from('public_profiles')
        .select('id, nome, foto_perfil, xp_total, nivel_xp, tipo_user')
        .in('id', ids)

      if (profilesError) throw profilesError

      return (profiles || [])
        .map((profile) => ({
          ...profile,
          periodo_xp: totals.get(profile.id) || 0,
          xp_ranking: totals.get(profile.id) || 0
        }))
        .sort((first, second) => second.xp_ranking - first.xp_ranking)
    }

    let query = supabase
      .from('public_profiles')
      .select('id, nome, foto_perfil, xp_total, nivel_xp, tipo_user')
      .eq('ativo', true)
      .order('xp_total', { ascending: false })
      .limit(50)

    if (filtro === 'desporto' && modalidadeId) {
      query = supabase.rpc('leaderboard_por_desporto', { p_modalidade_id: Number(modalidadeId) })
      const { data, error } = await query
      if (error) throw error
      return data || []
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []).map((profile) => ({ ...profile, xp_ranking: Number(profile.xp_total || 0) }))
  } catch (error) {
    if (isMissingRelationError(error, 'xp_logs') || isMissingColumnError(error, 'xp_total')) {
      console.warn('BoardSports XP System ainda não está aplicado na base de dados.')
      return []
    }

    console.error('Erro ao obter leaderboard XP:', error)
    return []
  }
}

export async function obterManobras(filtros = {}) {
  try {
    let query = supabase
      .from('manobras')
      .select('id, modalidade_id, nome, dificuldade, xp, descricao, ativo, modalidades(nome)')
      .eq('ativo', true)
      .order('modalidade_id')
      .order('dificuldade')
      .order('nome')

    if (filtros.modalidade_id) query = query.eq('modalidade_id', filtros.modalidade_id)
    if (filtros.dificuldade) query = query.eq('dificuldade', filtros.dificuldade)

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    if (isMissingRelationError(error, 'manobras')) return []
    console.error('Erro ao obter manobras:', error)
    return []
  }
}

export async function obterConquistasDiarias(userId) {
  try {
    if (!userId) return DAILY_ACHIEVEMENTS.map((item) => ({ ...item, concluída: false, reclamada: false }))

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const [spotsRes, videosRes, conquistasRes] = await Promise.all([
      supabase
        .from('spots')
        .select('id, data_criacao')
        .eq('criador_id', userId)
        .gte('data_criacao', start.toISOString()),
      supabase
        .from('spot_videos')
        .select('id, data_criacao')
        .eq('autor_id', userId)
        .eq('ativo', true)
        .gte('data_criacao', start.toISOString()),
      supabase
        .from('conquistas_diarias')
        .select('codigo, xp_ganho, data_conquista')
        .eq('user_id', userId)
        .eq('data_conquista', start.toISOString().slice(0, 10))
    ])

    const spotCount = spotsRes.error ? 0 : (spotsRes.data || []).length
    const videoCount = videosRes.error ? 0 : (videosRes.data || []).length
    const claimed = new Set((conquistasRes.error ? [] : conquistasRes.data || []).map((item) => item.codigo))

    return DAILY_ACHIEVEMENTS.map((item) => {
      const concluída = item.codigo === 'checkin_diario'
        || (item.codigo === 'spot_diario' && spotCount > 0)
        || (item.codigo === 'video_diario' && videoCount > 0)

      return {
        ...item,
        concluída,
        reclamada: claimed.has(item.codigo),
        progresso: item.codigo === 'spot_diario'
          ? spotCount
          : item.codigo === 'video_diario'
            ? videoCount
            : 1
      }
    })
  } catch (error) {
    if (isMissingRelationError(error, 'conquistas_diarias')) {
      return DAILY_ACHIEVEMENTS.map((item) => ({ ...item, concluída: false, reclamada: false, progresso: 0 }))
    }

    console.error('Erro ao obter conquistas diárias:', error)
    return []
  }
}

export async function reclamarConquistaDiaria(codigo) {
  try {
    const { data, error } = await supabase.rpc('reclamar_conquista_diaria', {
      p_codigo: codigo
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao reclamar conquista diária:', error)
    return {
      sucesso: false,
      erro: error.message || 'Não foi possível reclamar a conquista diária.'
    }
  }
}

export async function criarSubmissãoXp(payload) {
  try {
    const { data, error } = await supabase
      .from('submissoes')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return { sucesso: true, data }
  } catch (error) {
    console.error('Erro ao criar submissão XP:', error)
    return { sucesso: false, erro: error.message || 'Não foi possível criar a submissao.' }
  }
}

export async function obterSubmissoesModeracao(filtros = {}) {
  try {
    let query = supabase
      .from('submissoes')
      .select('id, user_id, spot_id, manobra_id, combo_id, tipo, prova_url, latitude, longitude, distancia_spot_metros, estado, motivo_rejeicao, xp_previsto, xp_atribuido, data_submissao, data_validacao')
      .order('data_submissao', { ascending: false })

    if (filtros.estado) query = query.eq('estado', filtros.estado)

    const { data: submissoes, error } = await query
    if (error) throw error
    if (!submissoes?.length) return []

    const userIds = [...new Set(submissoes.map((item) => item.user_id).filter(Boolean))]
    const spotIds = [...new Set(submissoes.map((item) => item.spot_id).filter(Boolean))]
    const manobraIds = [...new Set(submissoes.map((item) => item.manobra_id).filter(Boolean))]

    const [profilesRes, spots, manobrasRes] = await Promise.all([
      userIds.length
        ? supabase.from('public_profiles').select('id, nome, tipo_user, xp_total, nivel_xp').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      spotIds.length ? obterSpots({ ids: spotIds }) : Promise.resolve([]),
      manobraIds.length
        ? supabase.from('manobras').select('id, modalidade_id, nome, dificuldade, xp, modalidades(nome)').in('id', manobraIds)
        : Promise.resolve({ data: [], error: null })
    ])

    if (profilesRes.error) throw profilesRes.error
    if (manobrasRes.error) throw manobrasRes.error

    const profileMap = new Map((profilesRes.data || []).map((profile) => [profile.id, profile]))
    const spotMap = new Map((spots || []).map((spot) => [spot.id, spot]))
    const manobraMap = new Map((manobrasRes.data || []).map((manobra) => [manobra.id, manobra]))

    return submissoes.map((submissao) => ({
      ...submissao,
      usuario: profileMap.get(submissao.user_id) || null,
      spot: spotMap.get(submissao.spot_id) || null,
      manobra: manobraMap.get(submissao.manobra_id) || null
    }))
  } catch (error) {
    if (isMissingRelationError(error, 'submissoes')) return []
    console.error('Erro ao obter submissões XP:', error)
    return []
  }
}

export async function moderarSubmissãoXp(submissãoId, estado, motivo = '') {
  try {
    const { data, error } = await supabase.rpc('moderar_submissao_xp', {
      p_submissao_id: submissãoId,
      p_estado: estado,
      p_motivo_rejeicao: motivo || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao moderar submissão XP:', error)
    return null
  }
}

// ============================================================
// Fim do arquivo
// ============================================================






