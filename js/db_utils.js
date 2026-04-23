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
    const [produtos, eventos, empresas, atletas, pendentesModeracao] = await Promise.all([
      countRows('produtos', (query) => query.eq('ativo', true)),
      countRows('eventos', (query) => query.eq('ativo', true)),
      countRows('profiles', (query) => query.eq('ativo', true).eq('role', 'empresa')),
      countRows('profiles', (query) => query.eq('ativo', true).eq('role', 'atleta')),
      countRows('solicitacoes_publicacao', (query) => query.eq('status', 'pendente'))
    ])

    return {
      produtos,
      eventos,
      empresas,
      atletas,
      pendentesModeracao
    }
  } catch (error) {
    console.error('Erro ao obter estatisticas do dashboard:', error)
    return {
      produtos: 0,
      eventos: 0,
      empresas: 0,
      atletas: 0,
      pendentesModeracao: 0
    }
  }
}

// ============================================================
// 2. FUNÇÕES DE PRODUTOS
// ============================================================

export async function obterProdutos(filtros = {}) {
  try {
    let query = supabase
      .from('produtos')
      .select('*, profiles(nome), modalidades(nome)')
      .eq('ativo', true)
      .order('data_criacao', { ascending: false })

    if (filtros.modalidade_id) {
      query = query.eq('modalidade_id', filtros.modalidade_id)
    } else if (filtros.modalidade) {
      query = query.eq('modalidade_id', filtros.modalidade)
    }

    if (filtros.empresa_id) {
      query = query.eq('empresa_id', filtros.empresa_id)
    }

    if (filtros.minimo_stock) {
      query = query.gt('stock', 0)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []).map((produto) => ({
      ...produto,
      produto_nome: produto.nome,
      empresa_nome: produto.profiles?.nome || 'Empresa',
      modalidade_nome: produto.modalidades?.nome || ''
    }))
  } catch (error) {
    console.error('Erro ao obter produtos:', error)
    return []
  }
}

export async function obterProduto(id) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, profiles(nome), modalidades(nome)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao obter produto:', error)
    return null
  }
}

export async function criarProduto(produto) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .insert([produto])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return null
  }
}

export async function atualizarProduto(id, updates) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return null
  }
}

export async function apagarProduto(id) {
  try {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao apagar produto:', error)
    return false
  }
}

// ============================================================
// 3. FUNÇÕES DE EVENTOS
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
          .from('profiles')
          .select('id, nome, email, foto_perfil')
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
// 4. FUNÇÕES DE PEDIDOS
// ============================================================

export async function criarPedido(pedido) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .insert([pedido])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return null
  }
}

export async function obterPedidos(usuario_id) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .or(`cliente_id.eq.${usuario_id},empresa_id.eq.${usuario_id}`)
      .order('data_pedido', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter pedidos:', error)
    return []
  }
}

export async function obterPedidosDetalhados(usuario_id) {
  try {
    const pedidos = await obterPedidos(usuario_id)
    if (!pedidos.length) return []

    const pedidoIds = pedidos.map((pedido) => pedido.id)
    const { data: items, error: itemsError } = await supabase
      .from('pedido_items')
      .select('*')
      .in('pedido_id', pedidoIds)

    if (itemsError) throw itemsError

    const produtoIds = [...new Set((items || []).map((item) => item.produto_id).filter(Boolean))]
    const { data: produtos, error: produtosError } = produtoIds.length
      ? await supabase
          .from('produtos')
          .select('id, nome, imagem')
          .in('id', produtoIds)
      : { data: [], error: null }

    if (produtosError) throw produtosError

    const produtoMap = new Map((produtos || []).map((produto) => [produto.id, produto]))

    return pedidos.map((pedido) => ({
      ...pedido,
      items: (items || [])
        .filter((item) => item.pedido_id === pedido.id)
        .map((item) => ({
          ...item,
          produto: produtoMap.get(item.produto_id) || null
        }))
    }))
  } catch (error) {
    console.error('Erro ao obter pedidos detalhados:', error)
    return []
  }
}

export async function obterPedidosEmpresa(empresa_id) {
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('data_pedido', { ascending: false })

    if (error) throw error
    if (!pedidos?.length) return []

    const pedidoIds = pedidos.map((pedido) => pedido.id)
    const clienteIds = [...new Set(pedidos.map((pedido) => pedido.cliente_id).filter(Boolean))]

    const [
      { data: items, error: itemsError },
      { data: clientes, error: clientesError }
    ] = await Promise.all([
      supabase
        .from('pedido_items')
        .select('*')
        .in('pedido_id', pedidoIds),
      clienteIds.length
        ? supabase
            .from('profiles')
            .select('id, nome, email')
            .in('id', clienteIds)
        : Promise.resolve({ data: [], error: null })
    ])

    if (itemsError) throw itemsError
    if (clientesError) throw clientesError

    const produtoIds = [...new Set((items || []).map((item) => item.produto_id).filter(Boolean))]
    const { data: produtos, error: produtosError } = produtoIds.length
      ? await supabase
          .from('produtos')
          .select('id, nome, imagem')
          .in('id', produtoIds)
      : { data: [], error: null }

    if (produtosError) throw produtosError

    const produtoMap = new Map((produtos || []).map((produto) => [produto.id, produto]))
    const clienteMap = new Map((clientes || []).map((cliente) => [cliente.id, cliente]))

    return pedidos.map((pedido) => ({
      ...pedido,
      cliente: clienteMap.get(pedido.cliente_id) || null,
      items: (items || [])
        .filter((item) => item.pedido_id === pedido.id)
        .map((item) => ({
          ...item,
          produto: produtoMap.get(item.produto_id) || null
        }))
    }))
  } catch (error) {
    console.error('Erro ao obter pedidos da empresa:', error)
    return []
  }
}

export async function atualizarPedidoStatus(id, status) {
  try {
    const updates = {
      status,
      data_entrega: status === 'entregue' ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from('pedidos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar estado do pedido:', error)
    return null
  }
}

export async function adicionarItemPedido(pedido_id, produto_id, quantidade) {
  try {
    // Obter preço do produto
    const { data: produto } = await supabase
      .from('produtos')
      .select('preco')
      .eq('id', produto_id)
      .single()

    if (!produto) throw new Error('Produto não encontrado')

    const subtotal = produto.preco * quantidade

    const { data, error } = await supabase
      .from('pedido_items')
      .insert([{
        pedido_id,
        produto_id,
        quantidade,
        preco_unitario: produto.preco,
        subtotal
      }])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao adicionar item ao pedido:', error)
    return null
  }
}

export async function processarCheckout(items, enderecoEntrega = '', notas = '') {
  try {
    const payload = (items || []).map((item) => ({
      product_id: item.product_id ?? item.id,
      quantity: item.quantity
    }))

    const { data, error } = await supabase.rpc('processar_checkout', {
      p_items: payload,
      p_endereco_entrega: enderecoEntrega || null,
      p_notas: notas || null
    })

    if (error) throw error
    return data?.orders ?? null
  } catch (error) {
    console.error('Erro ao processar checkout:', error)
    return null
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
      return { url: null, error: 'Formato invalido. Usa JPG, PNG, WebP ou GIF.' }
    }

    if (file.size > PROFILE_AVATAR_MAX_SIZE) {
      return { url: null, error: 'A imagem e demasiado grande. Usa um ficheiro ate 5 MB.' }
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

        return { url: null, error: uploadError.message || 'Nao foi possivel enviar a imagem.' }
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
        error: 'Nao existe um bucket publico para avatars. Cria um bucket "avatars" no Supabase Storage.'
      }
    }

    return { url: null, error: 'Nao foi possivel enviar a imagem.' }
  } catch (error) {
    console.error('Erro ao fazer upload da foto de perfil:', error)
    return { url: null, error: error.message || 'Erro inesperado ao enviar a foto.' }
  }
}

export async function obterProdutosEmpresa(empresa_id) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, modalidades(nome)')
      .eq('empresa_id', empresa_id)
      .order('data_criacao', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter produtos da empresa:', error)
    return []
  }
}

export async function obterEmpresa(empresa_id) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', empresa_id)
      .eq('role', 'empresa')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao obter empresa:', error)
    return null
  }
}

// ============================================================
// 6. FUNÇÕES DE AVALIAÇÕES
// ============================================================

export async function obterAvaliacoes(produto_id) {
  try {
    const { data, error } = await supabase
      .from('avaliacoes')
      .select('*, profiles(nome)')
      .eq('produto_id', produto_id)
      .order('data_criacao', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao obter avaliações:', error)
    return []
  }
}

export async function criarAvaliacao(usuario_id, produto_id, classificacao, comentario) {
  try {
    const { data, error } = await supabase
      .from('avaliacoes')
      .insert([{
        usuario_id,
        produto_id,
        classificacao,
        comentario
      }])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao criar avaliação:', error)
    return null
  }
}

// ============================================================
// 7. FUNÇÕES DE BUSCA
// ============================================================

export async function buscarProdutos(termo) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .or(`nome.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .eq('ativo', true)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return []
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
}

function buildSpotsBaseSelect(includeVideoUrl = true) {
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
      publico,
      data_criacao,
      ativo
    `
}

export async function obterSpots(filtros = {}) {
  try {
    const aplicarFiltros = (query) => {
      if (filtros.modalidade_id && filtros.modalidade_id !== 'all') {
        query = query.eq('modalidade_id', parseInt(filtros.modalidade_id))
      }
      if (Array.isArray(filtros.ids) && filtros.ids.length) {
        query = query.in('id', filtros.ids)
      }
      if (filtros.criador_id) {
        query = query.eq('criador_id', filtros.criador_id)
      }
      return query
    }

    const runSpotsQuery = (includeVideoUrl) => aplicarFiltros(
      supabase
        .from('spots')
        .select(buildSpotsBaseSelect(includeVideoUrl))
        .order('data_criacao', { ascending: false })
    )

    let includeVideoUrl = true
    let { data, error } = await runSpotsQuery(includeVideoUrl)

    if (error && isMissingColumnError(error, 'video_url')) {
      includeVideoUrl = false
      console.warn('A coluna spots.video_url ainda nao existe na base ativa. A carregar spots sem esse campo.')
      ;({ data, error } = await runSpotsQuery(includeVideoUrl))
    }

    if (error) {
      console.error('Erro na query de spots:', error)
      throw error
    }

    const spots = (data || []).map((spot) => ({
      ...spot,
      video_url: includeVideoUrl ? spot.video_url || null : null
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
        ? supabase.from('profiles').select('id, nome, role, email').in('id', criadorIds)
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
    const { data, error } = await supabase
      .from('spots')
      .insert([spotData])
      .select()
      .single()

    if (error && isMissingColumnError(error, 'video_url')) {
      const fallbackPayload = { ...spotData }
      delete fallbackPayload.video_url

      const retry = await supabase
        .from('spots')
        .insert([fallbackPayload])
        .select()
        .single()

      if (retry.error) throw retry.error
      return retry.data
    }

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar spot:', error)
    return null
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
        ? supabase.from('profiles').select('id, nome, email').in('id', usuarioIds)
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
    console.error('Erro ao obter solicitacoes de publicacao:', error)
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
    console.error('Erro ao moderar solicitacao de publicacao:', error)
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
      coordenadas_lat: updates.coordenadas_lat,
      coordenadas_long: updates.coordenadas_long,
      data_atualizacao: new Date().toISOString()
    }

    let { data, error } = await supabase
      .from('spots')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error && isMissingColumnError(error, 'video_url')) {
      const fallbackPayload = { ...payload }
      delete fallbackPayload.video_url

      const retry = await supabase
        .from('spots')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .single()

      data = retry.data
      error = retry.error
    }

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar spot:', error)
    return null
  }
}

export async function apagarSpot(id) {
  try {
    const { error } = await supabase
      .from('spots')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao apagar spot:', error)
    return false
  }
}

// ============================================================
// Fim do arquivo
// ============================================================
