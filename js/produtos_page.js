import { obterUsuarioAtual } from './auth_utils.js'
import {
  obterAvaliacoes,
  obterModalidades,
  obterProdutos,
  criarAvaliacao,
  processarCheckout
} from './db_utils.js'
import {
  addToCart,
  clearCart,
  getCartTotal,
  loadCart,
  removeFromCart,
  updateCartQuantity
} from './cart_utils.js'
import { showToast } from './ui_feedback.js'

const state = {
  user: null,
  modalidades: [],
  produtos: [],
  filteredProdutos: [],
  cart: [],
  activeProduct: null,
  reviewsByProduct: new Map()
}

const ui = {
  search: null,
  modalidadeFilter: null,
  resultsCount: null,
  heroTotal: null,
  heroFilter: null,
  produtosContainer: null,
  cartItems: null,
  cartCount: null,
  cartTotal: null,
  checkoutForm: null,
  checkoutAddress: null,
  checkoutNotes: null,
  checkoutButton: null,
  modal: null,
  modalTitle: null,
  modalCompany: null,
  modalDescription: null,
  modalPrice: null,
  modalStock: null,
  modalImage: null,
  modalAdd: null,
  modalReviews: null,
  modalRating: null,
  reviewForm: null,
  reviewRating: null,
  reviewComment: null
}

async function initProdutosPage() {
  cacheDom()
  bindEvents()

  const params = new URLSearchParams(window.location.search)
  const modalidadeId = params.get('modalidade') || ''
  if (modalidadeId) {
    ui.modalidadeFilter.value = modalidadeId
  }

  state.user = await obterUsuarioAtual()
  state.cart = loadCart()

  await Promise.all([carregarModalidades(), carregarProdutos()])
  renderCart()
}

function cacheDom() {
  ui.search = document.getElementById('market-search')
  ui.modalidadeFilter = document.getElementById('market-modalidade-filter')
  ui.resultsCount = document.getElementById('market-results-count')
  ui.heroTotal = document.getElementById('market-hero-total')
  ui.heroFilter = document.getElementById('market-hero-filter')
  ui.produtosContainer = document.getElementById('produtos-container')
  ui.cartItems = document.getElementById('cart-items')
  ui.cartCount = document.getElementById('cart-count')
  ui.cartTotal = document.getElementById('cart-total')
  ui.checkoutForm = document.getElementById('checkout-form')
  ui.checkoutAddress = document.getElementById('checkout-address')
  ui.checkoutNotes = document.getElementById('checkout-notes')
  ui.checkoutButton = document.getElementById('checkout-btn')
  ui.modal = document.getElementById('product-modal')
  ui.modalTitle = document.getElementById('product-modal-title')
  ui.modalCompany = document.getElementById('product-modal-company')
  ui.modalDescription = document.getElementById('product-modal-description')
  ui.modalPrice = document.getElementById('product-modal-price')
  ui.modalStock = document.getElementById('product-modal-stock')
  ui.modalImage = document.getElementById('product-modal-image')
  ui.modalAdd = document.getElementById('product-modal-add')
  ui.modalReviews = document.getElementById('product-reviews')
  ui.modalRating = document.getElementById('product-modal-rating')
  ui.reviewForm = document.getElementById('review-form')
  ui.reviewRating = document.getElementById('review-rating')
  ui.reviewComment = document.getElementById('review-comment')
}

function bindEvents() {
  ui.search.addEventListener('input', aplicarFiltros)
  ui.modalidadeFilter.addEventListener('change', aplicarFiltros)
  ui.checkoutForm.addEventListener('submit', onCheckout)
  ui.produtosContainer.addEventListener('click', onProductGridClick)
  ui.cartItems.addEventListener('click', onCartClick)
  ui.modal.addEventListener('click', onModalClick)
  ui.modalAdd.addEventListener('click', () => {
    if (!state.activeProduct) return
    adicionarProdutoAoCarrinho(state.activeProduct.id)
  })
  ui.reviewForm.addEventListener('submit', onSubmitReview)

  window.addEventListener('boardsports:cart-sync', () => {
    state.cart = loadCart()
    renderCart()
  })
}

async function carregarModalidades() {
  state.modalidades = await obterModalidades()
  const currentValue = ui.modalidadeFilter.value
  ui.modalidadeFilter.innerHTML = `
    <option value="">Todas as modalidades</option>
    ${state.modalidades.map((modalidade) => `
      <option value="${modalidade.id}">${escapeHtml(modalidade.nome)}</option>
    `).join('')}
  `

  ui.modalidadeFilter.value = currentValue || ''
}

async function carregarProdutos() {
  state.produtos = await obterProdutos()
  aplicarFiltros()
}

function aplicarFiltros() {
  const term = ui.search.value.trim().toLowerCase()
  const modalidadeValue = ui.modalidadeFilter.value

  state.filteredProdutos = state.produtos.filter((produto) => {
    const matchesTerm = !term || [
      produto.nome,
      produto.descricao,
      produto.empresa_nome,
      produto.modalidade_nome
    ].some((value) => String(value || '').toLowerCase().includes(term))

    const matchesModalidade = !modalidadeValue || String(produto.modalidade_id) === modalidadeValue
    return matchesTerm && matchesModalidade
  })

  renderProdutos()
  syncHeroMeta()
}

function renderProdutos() {
  if (!state.filteredProdutos.length) {
    ui.produtosContainer.innerHTML = `
      <article class="market-empty-card">
        <h2>Sem resultados</h2>
        <p>Nao encontramos produtos com os filtros atuais.</p>
      </article>
    `
    ui.resultsCount.textContent = '0 resultados'
    return
  }

  ui.resultsCount.textContent = `${state.filteredProdutos.length} resultados`
  ui.produtosContainer.innerHTML = state.filteredProdutos.map((produto) => {
    const visual = produto.imagem
      ? `style="background-image: linear-gradient(180deg, rgba(7, 10, 16, 0.18), rgba(7, 10, 16, 0.72)), url('${escapeAttribute(produto.imagem)}')"`
      : ''
    const visualClass = produto.imagem ? 'market-card-visual has-image' : 'market-card-visual'
    const label = produto.imagem ? escapeHtml(produto.modalidade_nome || 'BoardSports') : getProductGlyph(produto.modalidade_nome)

    return `
      <article class="market-card">
        <div class="${visualClass}" ${visual}>
          <strong>${label}</strong>
          <span class="market-card-tag">${escapeHtml(produto.modalidade_nome || 'Mercado')}</span>
        </div>
        <div class="market-card-body">
          <div>
            <h2>${escapeHtml(produto.nome)}</h2>
            <p>${escapeHtml(buildProductExcerpt(produto.descricao))}</p>
          </div>
          <div class="cart-item-company">${escapeHtml(produto.empresa_nome)}</div>
          <div class="market-card-meta">
            <strong>${formatCurrency(produto.preco)}</strong>
            <span>Stock: ${produto.stock ?? 0}</span>
          </div>
          <div class="market-card-actions">
            <button type="button" class="market-primary-button" data-add-product="${produto.id}" ${produto.stock > 0 ? '' : 'disabled'}>
              ${produto.stock > 0 ? 'Adicionar' : 'Sem stock'}
            </button>
            <button type="button" class="market-secondary-button" data-open-product="${produto.id}">
              Ver detalhe
            </button>
          </div>
        </div>
      </article>
    `
  }).join('')
}

function syncHeroMeta() {
  ui.heroTotal.textContent = `${state.produtos.length} produtos ativos`
  const selectedModalidade = state.modalidades.find((modalidade) => String(modalidade.id) === ui.modalidadeFilter.value)
  ui.heroFilter.textContent = selectedModalidade ? selectedModalidade.nome : 'Todas as modalidades'
}

function renderCart() {
  state.cart = loadCart()
  const itemCount = state.cart.reduce((total, item) => total + item.quantity, 0)

  ui.cartCount.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
  ui.cartTotal.textContent = formatCurrency(getCartTotal())

  if (!state.cart.length) {
    ui.cartItems.innerHTML = `
      <div class="cart-empty">
        <p>Adiciona produtos para preparar o pedido.</p>
      </div>
    `
    return
  }

  ui.cartItems.innerHTML = state.cart.map((item) => `
    <article class="cart-item">
      <div class="cart-item-header">
        <div>
          <strong>${escapeHtml(item.nome)}</strong>
          <span class="cart-item-company">${escapeHtml(item.empresa_nome)}</span>
        </div>
        <strong>${formatCurrency(item.preco * item.quantity)}</strong>
      </div>
      <div class="cart-item-controls">
        <div class="cart-item-stepper">
          <button type="button" class="cart-item-button" data-cart-decrease="${item.product_id}">-</button>
          <span>${item.quantity}</span>
          <button type="button" class="cart-item-button" data-cart-increase="${item.product_id}">+</button>
        </div>
        <button type="button" class="cart-item-button cart-item-remove" data-cart-remove="${item.product_id}">Remover</button>
      </div>
    </article>
  `).join('')
}

function onProductGridClick(event) {
  const addButton = event.target.closest('[data-add-product]')
  if (addButton) {
    adicionarProdutoAoCarrinho(Number(addButton.dataset.addProduct))
    return
  }

  const detailButton = event.target.closest('[data-open-product]')
  if (detailButton) {
    openProductModal(Number(detailButton.dataset.openProduct))
  }
}

function onCartClick(event) {
  const decrease = event.target.closest('[data-cart-decrease]')
  if (decrease) {
    const productId = Number(decrease.dataset.cartDecrease)
    const currentItem = state.cart.find((item) => item.product_id === productId)
    if (!currentItem) return

    if (currentItem.quantity <= 1) {
      removeFromCart(productId)
    } else {
      updateCartQuantity(productId, currentItem.quantity - 1)
    }
    renderCart()
    return
  }

  const increase = event.target.closest('[data-cart-increase]')
  if (increase) {
    const productId = Number(increase.dataset.cartIncrease)
    const currentItem = state.cart.find((item) => item.product_id === productId)
    if (!currentItem) return
    updateCartQuantity(productId, currentItem.quantity + 1)
    renderCart()
    return
  }

  const removeButton = event.target.closest('[data-cart-remove]')
  if (removeButton) {
    removeFromCart(Number(removeButton.dataset.cartRemove))
    renderCart()
  }
}

function adicionarProdutoAoCarrinho(productId) {
  const produto = state.produtos.find((item) => item.id === productId)
  if (!produto) return

  if ((produto.stock ?? 0) <= 0) {
    showToast('Este produto esta sem stock neste momento.', { type: 'warning' })
    return
  }

  addToCart(produto, 1)
  renderCart()
  showToast(`"${produto.nome}" foi adicionado ao carrinho.`, { type: 'success' })
}

async function onCheckout(event) {
  event.preventDefault()

  if (!state.cart.length) {
    showToast('O carrinho esta vazio.', { type: 'warning' })
    return
  }

  const address = ui.checkoutAddress.value.trim()
  const notes = ui.checkoutNotes.value.trim()

  if (address.length < 8) {
    showToast('Preenche um endereco de entrega valido antes de fechar o pedido.', { type: 'warning' })
    return
  }

  if (!state.user) {
    showToast('Faz login para concluir a compra. O carrinho fica guardado.', { type: 'warning', duration: 4200 })
    window.setTimeout(() => {
      window.location.href = '/login.html'
    }, 1100)
    return
  }

  ui.checkoutButton.disabled = true
  ui.checkoutButton.textContent = 'A processar pedido...'

  const resultado = await processarCheckout(state.cart, address, notes)

  ui.checkoutButton.disabled = false
  ui.checkoutButton.textContent = 'Finalizar compra'

  if (!resultado) {
    showToast('Nao foi possivel fechar o checkout. Verifica o stock e tenta novamente.', { type: 'error' })
    return
  }

  clearCart()
  state.cart = loadCart()
  ui.checkoutForm.reset()
  renderCart()
  await carregarProdutos()
  showToast(`Checkout concluido. Foram criados ${resultado.length} pedidos.`, { type: 'success', duration: 4200 })
}

async function openProductModal(productId) {
  const produto = state.produtos.find((item) => item.id === productId)
  if (!produto) return

  state.activeProduct = produto
  ui.modal.hidden = false
  document.body.style.overflow = 'hidden'

  ui.modalTitle.textContent = produto.nome
  ui.modalCompany.textContent = produto.empresa_nome || 'Empresa'
  ui.modalDescription.textContent = produto.descricao || 'Sem descricao detalhada.'
  ui.modalPrice.textContent = formatCurrency(produto.preco)
  ui.modalStock.textContent = `Stock: ${produto.stock ?? 0}`
  ui.modalAdd.disabled = (produto.stock ?? 0) <= 0
  ui.modalAdd.textContent = (produto.stock ?? 0) > 0 ? 'Adicionar ao carrinho' : 'Sem stock'

  ui.modalImage.textContent = produto.imagem ? '' : getProductGlyph(produto.modalidade_nome)
  ui.modalImage.classList.toggle('has-image', Boolean(produto.imagem))
  ui.modalImage.style.backgroundImage = produto.imagem
    ? `linear-gradient(180deg, rgba(7, 10, 16, 0.16), rgba(7, 10, 16, 0.7)), url('${produto.imagem.replace(/'/g, "\\'")}')`
    : ''

  await carregarAvaliacoes(productId)
}

function closeProductModal() {
  state.activeProduct = null
  ui.modal.hidden = true
  ui.reviewForm.reset()
  document.body.style.overflow = ''
}

function onModalClick(event) {
  if (event.target.closest('[data-modal-close]')) {
    closeProductModal()
  }
}

async function carregarAvaliacoes(productId) {
  const reviews = await obterAvaliacoes(productId)
  state.reviewsByProduct.set(productId, reviews)

  if (!reviews.length) {
    ui.modalRating.textContent = 'Sem avaliacoes'
    ui.modalReviews.innerHTML = '<p class="product-reviews-empty">Ainda nao existem reviews para este produto.</p>'
    return
  }

  const average = reviews.reduce((total, review) => total + Number(review.classificacao || 0), 0) / reviews.length
  ui.modalRating.textContent = `${average.toFixed(1)} / 5 (${reviews.length})`
  ui.modalReviews.innerHTML = reviews.map((review) => `
    <article class="product-review">
      <header>
        <strong>${escapeHtml(review.profiles?.nome || 'Utilizador')}</strong>
        <span>${'★'.repeat(Number(review.classificacao || 0))}</span>
      </header>
      <p>${escapeHtml(review.comentario || 'Sem comentario adicional.')}</p>
    </article>
  `).join('')
}

async function onSubmitReview(event) {
  event.preventDefault()

  if (!state.activeProduct) return

  if (!state.user) {
    showToast('Faz login para publicar uma review.', { type: 'warning' })
    return
  }

  const rating = Number(ui.reviewRating.value)
  const comment = ui.reviewComment.value.trim()

  if (!rating) {
    showToast('Seleciona uma classificacao.', { type: 'warning' })
    return
  }

  const resultado = await criarAvaliacao(state.user.id, state.activeProduct.id, rating, comment)
  if (!resultado) {
    showToast('Nao foi possivel guardar a review.', { type: 'error' })
    return
  }

  ui.reviewForm.reset()
  await carregarAvaliacoes(state.activeProduct.id)
  showToast('Review publicada com sucesso.', { type: 'success' })
}

function buildProductExcerpt(description = '') {
  if (!description) return 'Produto sem descricao detalhada.'
  return description.length > 118 ? `${description.slice(0, 115).trim()}...` : description
}

function getProductGlyph(modalidade = '') {
  const lower = modalidade.toLowerCase()
  if (lower.includes('surf')) return 'SURF'
  if (lower.includes('skate')) return 'SK8'
  if (lower.includes('snow')) return 'SNOW'
  if (lower.includes('sand')) return 'SAND'
  if (lower.includes('skim')) return 'SKIM'
  return 'BS'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value) || 0)
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", '&#39;')
}

document.addEventListener('DOMContentLoaded', initProdutosPage)
