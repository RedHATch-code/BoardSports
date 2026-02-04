import { inicializarPaginaProtegida } from './auth_utils.js'
import { obterProdutos } from './db_utils.js'

async function inicializarProdutos() {
  // Verificar autenticação
  await inicializarPaginaProtegida()

  // Carregar produtos
  await carregarProdutos()
}

async function carregarProdutos() {
  try {
    const params = new URLSearchParams(window.location.search)
    const modalidade = params.get('modalidade')
    const modalidadeId = modalidade ? parseInt(modalidade) : null
    const filtros = Number.isFinite(modalidadeId) ? { modalidade_id: modalidadeId } : {}

    const produtos = await obterProdutos(filtros)
    const container = document.getElementById('produtos-container')
    
    container.innerHTML = ''

    if (produtos.length === 0) {
      container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto encontrado</p>'
      return
    }
    
    produtos.forEach(produto => {
      const card = document.createElement('div')
      card.className = 'product-card'
      card.innerHTML = `
        <div class="product-image">🛹</div>
        <div class="product-info">
          <h3>${produto.produto_nome}</h3>
          <p>${produto.descricao}</p>
          <small>Por: ${produto.empresa_nome}</small>
          <div class="product-price">€${produto.preco.toFixed(2)}</div>
          <div class="product-stock">Stock: ${produto.stock}</div>
          <button class="btn-comprar" onclick="adicionarCarrinho(${produto.id})">
            Adicionar ao Carrinho
          </button>
        </div>
      `
      container.appendChild(card)
    })
  } catch (error) {
    console.error('Erro ao carregar produtos:', error)
  }
}

window.adicionarCarrinho = (produtoId) => {
  alert(`Produto ${produtoId} adicionado ao carrinho!`)
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', inicializarProdutos)
