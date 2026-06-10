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
          .from('profiles')
          .select('id, nome, email, foto_perfil, role, bio')
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

    let query = supabase
      .from('profiles')
      .select('id, nome, email, foto_perfil, role, bio')
      .ilike('email', normalizedEmail)
      .limit(1)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query
    if (error) throw error

    return data?.[0] || null
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
          .from('profiles')
          .select('id, nome, email, foto_perfil, role')
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
      obterGaleriaVideosSpots({ autor_id: usuario_id })
    ])
    const eventos = []
    const produtos = []

    const publicacoes = [
      ...(spots || []).map((spot) => ({
        id: `spot-${spot.id}`,
        tipo: 'Spot',
        titulo: spot.nome || 'Spot',
        descricao: spot.descricao || '',
        destaque: [spot.modalidades?.nome, spot.publico ? 'Publico' : 'Privado'].filter(Boolean).join(' · '),
        url: 'mapa.html',
        data: spot.data_criacao || null
      })),
      ...(eventos || []).map((evento) => ({
        id: `evento-${evento.id}`,
        tipo: 'Evento',
        titulo: evento.nome || 'Evento',
        descricao: evento.descricao || '',
        destaque: [evento.modalidade, evento.localidade].filter(Boolean).join(' · '),
        url: 'mapa.html',
        data: evento.data_inicio || evento.data_criacao || null
      })),
      ...(produtos || []).map((produto) => ({
        id: `produto-${produto.id}`,
        tipo: 'Produto',
        titulo: produto.nome || 'Produto',
        descricao: produto.descricao || '',
        destaque: [produto.modalidade_nome, formatarMontante(produto.preco)].filter(Boolean).join(' · '),
        url: 'register.html',
        data: produto.data_criacao || null
      })),
      ...(videos || []).map((video) => ({
        id: `video-${video.id}`,
        tipo: 'Video',
        titulo: video.spot?.nome || 'Video de spot',
        descricao: video.legenda || 'Video publicado num spot da comunidade.',
        destaque: [video.spot?.modalidades?.nome, video.spot?.nome].filter(Boolean).join(' · '),
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
    console.error('Erro ao obter publicacoes do perfil:', error)
    return []
  }
}

function formatarMontante(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''

  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
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
    || (message.includes(normalizedColumn) && message.includes('could not find'))
}

function isMissingRelationError(error, relationName) {
  const message = error?.message?.toLowerCase?.() || ''
  const normalizedRelation = String(relationName || '').toLowerCase()
  return error?.code === 'PGRST205'
    || error?.code === '42P01'
    || (message.includes(normalizedRelation) && message.includes('does not exist'))
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
      dificuldade,
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

    const runSpotsQuery = (includeVideoUrl) => aplicarFiltros(
      supabase
        .from('spots')
        .select(buildSpotsBaseSelect(includeVideoUrl))
        .order('data_criacao', { ascending: false })
    )

    // The active Supabase schema used by the static site still lacks
    // spots.video_url, so we avoid the initial 400 on every map load.
    let includeVideoUrl = false
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
      dificuldade: spot.dificuldade || 'facil',
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

    if (error && isMissingColumnError(error, 'dificuldade')) {
      const fallbackPayload = { ...spotData }
      delete fallbackPayload.dificuldade

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

async function hydrateSpotVideos(items = []) {
  const spotIds = [...new Set((items || []).map((item) => item.spot_id).filter(Boolean))]
  const autorIds = [...new Set((items || []).map((item) => item.autor_id).filter(Boolean))]

  const [spots, autoresRes] = await Promise.all([
    spotIds.length ? obterSpots({ ids: spotIds }) : Promise.resolve([]),
    autorIds.length
      ? supabase.from('profiles').select('id, nome, email, foto_perfil, role').in('id', autorIds)
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

async function obterVideosSpotsLegacy(filtros = {}) {
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

function readLocalSpotVideos() {
  try {
    const raw = window.localStorage.getItem(LOCAL_SPOT_VIDEOS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Nao foi possivel ler videos locais dos spots:', error)
    return []
  }
}

function writeLocalSpotVideos(items = []) {
  try {
    window.localStorage.setItem(LOCAL_SPOT_VIDEOS_KEY, JSON.stringify(items))
    return true
  } catch (error) {
    console.warn('Nao foi possivel guardar videos locais dos spots:', error)
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

async function obterVideosSpotsLocal(filtros = {}) {
  const items = filterSpotVideoItems(readLocalSpotVideos(), filtros)
  return hydrateSpotVideos(items)
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
    analise_score: payload.analise_score || 0,
    analise_resultado: payload.analise_resultado || {},
    data_criacao: new Date().toISOString(),
    ativo: true
  }

  const currentItems = readLocalSpotVideos()
  currentItems.unshift(nextItem)
  return writeLocalSpotVideos(currentItems) ? nextItem : null
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
      result.sugestoes.push('Este video entra no feed de curtos verticais.')
    } else {
      result.formato = 'long'
      result.orientacao = 'horizontal'
      result.score += 14
      result.sugestoes.push('Este video entra na grelha de videos longos horizontais.')
    }

    if (parsed.protocol !== 'https:') {
      result.score -= 18
      result.avisos.push('O link nao usa HTTPS.')
    }
  } catch (error) {
    result.score = 15
    result.avisos.push('URL invalido ou incompleto.')
    result.sugestoes.push('Cola um link completo, por exemplo https://youtube.com/...')
  }

  result.score = Math.max(0, Math.min(100, Math.round(result.score)))
  if (result.score >= 80) result.qualidade = 'Boa'
  else if (result.score >= 55) result.qualidade = 'Media'
  else result.qualidade = 'Baixa'

  return result
}

export async function obterGaleriaVideosSpots(filtros = {}) {
  try {
    let query = supabase
      .from('spot_videos')
      .select('id, spot_id, autor_id, video_url, legenda, formato, plataforma, analise_score, analise_resultado, data_criacao, ativo')
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

    const { data, error } = await query

    if (error && (
      isMissingRelationError(error, 'spot_videos')
      || isMissingColumnError(error, 'formato')
      || isMissingColumnError(error, 'plataforma')
      || isMissingColumnError(error, 'analise_score')
      || isMissingColumnError(error, 'analise_resultado')
    )) {
      const [legacyItems, localItems] = await Promise.all([
        obterVideosSpotsLegacy(filtros),
        obterVideosSpotsLocal(filtros)
      ])

      return [...localItems, ...legacyItems].sort((first, second) => {
        const firstValue = first?.data_criacao ? new Date(first.data_criacao).getTime() : 0
        const secondValue = second?.data_criacao ? new Date(second.data_criacao).getTime() : 0
        return secondValue - firstValue
      })
    }

    if (error) throw error
    return hydrateSpotVideos(data || [])
  } catch (error) {
    console.error('Erro ao obter galeria de videos dos spots:', error)
    return []
  }
}

export async function publicarVideoSpot({ spot_id, autor_id, video_url, legenda = '' }) {
  try {
    const analysis = analisarVideoUrl(video_url)
    const payload = {
      spot_id,
      autor_id,
      video_url: String(video_url || '').trim(),
      legenda: String(legenda || '').trim() || null,
      formato: analysis.formato,
      plataforma: analysis.plataforma,
      analise_score: analysis.score,
      analise_resultado: analysis
    }

    if (!payload.spot_id || !payload.autor_id || !payload.video_url) {
      return { sucesso: false, erro: 'Preenche o URL do video antes de publicar.' }
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
          erro: 'A base ativa ainda nao suporta a tabela de videos e o fallback local tambem falhou neste browser.'
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
      || isMissingColumnError(error, 'analise_score')
      || isMissingColumnError(error, 'analise_resultado')
    )) {
      const fallbackPayload = { ...payload }
      delete fallbackPayload.formato
      delete fallbackPayload.plataforma
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
    console.error('Erro ao publicar video no spot:', error)

    const rawMessage = error.message || ''
    if (rawMessage.toLowerCase().includes('row-level security')) {
      return {
        sucesso: false,
        erro: 'A base de dados bloqueou a publicacao por permissao. Faz logout/login e tenta novamente.'
      }
    }

    return { sucesso: false, erro: error.message || 'Nao foi possivel publicar o video neste spot.' }
  }
}

export async function apagarVideoSpot(id) {
  try {
    if (!id) return false

    if (String(id).startsWith('local-')) {
      const nextItems = readLocalSpotVideos().filter((item) => String(item.id) !== String(id))
      return writeLocalSpotVideos(nextItems)
    }

    const { error } = await supabase
      .from('spot_videos')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao apagar video do spot:', error)
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
      dificuldade: updates.dificuldade || 'facil',
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

    if (error && isMissingColumnError(error, 'dificuldade')) {
      const fallbackPayload = { ...payload }
      delete fallbackPayload.dificuldade

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
    descricao: 'Publica pelo menos um video num spot hoje.',
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
        .from('profiles')
        .select('id, nome, email, foto_perfil, xp_total, nivel_xp, tipo_user')
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
      .from('profiles')
      .select('id, nome, email, foto_perfil, xp_total, nivel_xp, tipo_user')
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
      console.warn('BoardSports XP System ainda nao esta aplicado na base de dados.')
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
    if (!userId) return DAILY_ACHIEVEMENTS.map((item) => ({ ...item, concluida: false, reclamada: false }))

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
      const concluida = item.codigo === 'checkin_diario'
        || (item.codigo === 'spot_diario' && spotCount > 0)
        || (item.codigo === 'video_diario' && videoCount > 0)

      return {
        ...item,
        concluida,
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
      return DAILY_ACHIEVEMENTS.map((item) => ({ ...item, concluida: false, reclamada: false, progresso: 0 }))
    }

    console.error('Erro ao obter conquistas diarias:', error)
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
    console.error('Erro ao reclamar conquista diaria:', error)
    return {
      sucesso: false,
      erro: error.message || 'Nao foi possivel reclamar a conquista diaria.'
    }
  }
}

export async function criarSubmissaoXp(payload) {
  try {
    const { data, error } = await supabase
      .from('submissoes')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return { sucesso: true, data }
  } catch (error) {
    console.error('Erro ao criar submissao XP:', error)
    return { sucesso: false, erro: error.message || 'Nao foi possivel criar a submissao.' }
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
        ? supabase.from('profiles').select('id, nome, email, tipo_user, xp_total, nivel_xp').in('id', userIds)
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
    console.error('Erro ao obter submissoes XP:', error)
    return []
  }
}

export async function moderarSubmissaoXp(submissaoId, estado, motivo = '') {
  try {
    const { data, error } = await supabase.rpc('moderar_submissao_xp', {
      p_submissao_id: submissaoId,
      p_estado: estado,
      p_motivo_rejeicao: motivo || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao moderar submissao XP:', error)
    return null
  }
}

// ============================================================
// Fim do arquivo
// ============================================================
