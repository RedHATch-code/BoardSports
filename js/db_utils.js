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

// ============================================================
// 2. FUNÇÕES DE PRODUTOS
// ============================================================

export async function obterProdutos(filtros = {}) {
  try {
    let query = supabase
      .from('produtos_com_empresa')
      .select('*')

    if (filtros.modalidade_id) {
      query = query.eq('modalidade_id', filtros.modalidade_id)
    } else if (filtros.modalidade) {
      query = query.eq('modalidade_id', filtros.modalidade)
    }

    if (filtros.empresa_id) {
      query = query.eq('empresa_nome', filtros.empresa_nome)
    }

    if (filtros.minimo_stock) {
      query = query.gt('stock', 0)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
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

// ============================================================
// 3. FUNÇÕES DE EVENTOS
// ============================================================

export async function obterEventos(filtros = {}) {
  try {
    let query = supabase
      .from('eventos_com_stats')
      .select('*')
      .eq('ativo', true)
      .order('data_inicio')

    if (filtros.modalidade) {
      query = query.eq('modalidade', filtros.modalidade)
    }

    if (filtros.proximo) {
      query = query.gte('data_inicio', new Date().toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
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

export async function obterSpots(filtros = {}) {
  try {
    const baseSelect = `
      id,
      nome,
      descricao,
      coordenadas_lat,
      coordenadas_long,
      criador_id,
      modalidade_id,
      categoria_id,
      publico,
      data_criacao,
      ativo
    `
    const fullSelectWithVideo = `${baseSelect}, video_url, modalidades(nome), categorias(nome), profiles(nome, role, email)`
    const fullSelect = `${baseSelect}, modalidades(nome), categorias(nome), profiles(nome, role, email)`

    const aplicarFiltros = (query) => {
      if (filtros.modalidade_id && filtros.modalidade_id !== 'all') {
        query = query.eq('modalidade_id', parseInt(filtros.modalidade_id))
      }
      if (filtros.criador_id) {
        query = query.eq('criador_id', filtros.criador_id)
      }
      return query
    }

    let query = aplicarFiltros(
      supabase
        .from('spots')
        .select(fullSelectWithVideo)
    )

    let { data, error } = await query

    if (error) {
      console.warn('Erro na query de spots (com video/joins). A tentar sem video...', error)
      query = aplicarFiltros(
        supabase
          .from('spots')
          .select(fullSelect)
      )
      const retry = await query
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.warn('Erro na query de spots (sem joins). A tentar sem joins...', error)
      query = aplicarFiltros(
        supabase
          .from('spots')
          .select(baseSelect)
      )
      const retry = await query
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('Erro na query de spots:', error)
      throw error
    }

    return data || []
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
    const { data, error } = await supabase
      .from('spots')
      .update({
        nome: updates.nome,
        descricao: updates.descricao,
        video_url: updates.video_url,
        modalidade_id: updates.modalidade_id,
        categoria_id: updates.categoria_id,
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
