import { inicializarPaginaProtegida, obterUsuarioAtual } from './auth_utils.js'
import {
  apagarProduto,
  atualizarPedidoStatus,
  atualizarPerfil,
  atualizarProduto,
  criarProduto,
  obterModalidades,
  obterPedidosEmpresa,
  obterProdutosEmpresa
} from './db_utils.js'
import { showConfirm, showToast } from './ui_feedback.js'

const ORDER_STATUSES = ['pendente', 'processando', 'enviado', 'entregue', 'cancelado']

const state = {
  user: null,
  produtos: [],
  pedidos: []
}

const ui = {
  tabs: null,
  panels: null,
  companyName: null,
  companySite: null,
  companyLogo: null,
  companyBio: null,
  companyUrl: null,
  preview: null,
  previewName: null,
  previewSite: null,
  previewBio: null,
  previewLogo: null,
  brandLabel: null,
  productCount: null,
  stockSummary: null,
  productForm: null,
  productId: null,
  productName: null,
  productPrice: null,
  productStock: null,
  productModalidade: null,
  productImage: null,
  productDescription: null,
  productSubmit: null,
  productCancel: null,
  productList: null,
  orderCount: null,
  orderList: null
}

async function initEmpresaPage() {
  const autenticado = await inicializarPaginaProtegida()
  if (!autenticado) return

  cacheDom()
  bindEvents()

  state.user = await obterUsuarioAtual()
  if (!state.user || state.user.perfil?.role !== 'empresa') {
    renderAccessDenied()
    return
  }

  await Promise.all([carregarModalidades(), carregarProdutosEmpresa(), carregarPedidosEmpresa()])
  preencherPerfilAtual()
  atualizarPreview()
}

function cacheDom() {
  ui.tabs = [...document.querySelectorAll('[data-tab]')]
  ui.panels = [...document.querySelectorAll('.company-panel')]
  ui.companyName = document.getElementById('empresa-nome')
  ui.companySite = document.getElementById('empresa-site')
  ui.companyLogo = document.getElementById('empresa-logo-url')
  ui.companyBio = document.getElementById('empresa-bio')
  ui.companyUrl = document.getElementById('empresa-url')
  ui.preview = document.getElementById('empresa-preview')
  ui.previewName = document.getElementById('empresa-nome-preview')
  ui.previewSite = document.getElementById('empresa-site-preview')
  ui.previewBio = document.getElementById('empresa-bio-preview')
  ui.previewLogo = document.getElementById('empresa-logo')
  ui.brandLabel = document.getElementById('company-brand-label')
  ui.productCount = document.getElementById('company-product-count')
  ui.stockSummary = document.getElementById('company-stock-summary')
  ui.productForm = document.getElementById('form-produto')
  ui.productId = document.getElementById('produto-id')
  ui.productName = document.getElementById('produto-nome')
  ui.productPrice = document.getElementById('produto-preco')
  ui.productStock = document.getElementById('produto-stock')
  ui.productModalidade = document.getElementById('produto-modalidade')
  ui.productImage = document.getElementById('produto-imagem')
  ui.productDescription = document.getElementById('produto-descricao')
  ui.productSubmit = document.getElementById('produto-submit')
  ui.productCancel = document.getElementById('produto-cancelar')
  ui.productList = document.getElementById('produtos-empresa')
  ui.orderCount = document.getElementById('company-order-count')
  ui.orderList = document.getElementById('pedidos-empresa')
}

function bindEvents() {
  ui.tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab))
  })

  document.getElementById('btn-sugerir-perfil').addEventListener('click', preencherSugestaoDeDominio)
  document.getElementById('btn-guardar-perfil').addEventListener('click', guardarPerfil)
  ui.productForm.addEventListener('submit', onSubmitProduto)
  ui.productCancel.addEventListener('click', resetProductForm)
  ui.productList.addEventListener('click', onProductListClick)
  ui.orderList.addEventListener('click', onOrderListClick)

  ;[ui.companyName, ui.companySite, ui.companyLogo, ui.companyBio].forEach((field) => {
    field.addEventListener('input', atualizarPreview)
  })
}

function renderAccessDenied() {
  const shell = document.querySelector('.company-shell')
  if (!shell) return

  shell.innerHTML = `
    <section class="company-hero">
      <div>
        <span class="company-kicker">Acesso restrito</span>
        <h1>Esta area e exclusiva para empresas.</h1>
        <p>Entra com uma conta de empresa para gerir catalogo, pedidos e perfil publico num unico workspace.</p>
      </div>
      <div class="company-hero-meta">
        <strong>Conta errada</strong>
        <span>Perfil sem permissao</span>
        <small>Se acabaste de mudar de conta, faz logout e entra novamente com a empresa correta.</small>
      </div>
    </section>
  `
}

function setActiveTab(tabKey) {
  ui.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabKey))
  ui.panels.forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tabKey}`))
}

async function carregarModalidades() {
  const modalidades = await obterModalidades()
  ui.productModalidade.innerHTML = `
    <option value="">Selecionar</option>
    ${modalidades.map((modalidade) => `
      <option value="${modalidade.id}">${escapeHtml(modalidade.nome)}</option>
    `).join('')}
  `
}

async function carregarProdutosEmpresa() {
  state.produtos = await obterProdutosEmpresa(state.user.id)
  renderProdutosEmpresa()
}

async function carregarPedidosEmpresa() {
  state.pedidos = await obterPedidosEmpresa(state.user.id)
  renderPedidosEmpresa()
}

function preencherPerfilAtual() {
  const perfil = state.user?.perfil || {}
  ui.companyName.value = perfil.nome || ''
  ui.companySite.value = perfil.website_url || ''
  ui.companyLogo.value = perfil.foto_perfil || ''
  ui.companyBio.value = perfil.bio || ''
  ui.companyUrl.value = perfil.website_url || ''

  ui.brandLabel.textContent = perfil.nome || 'Perfil por completar'
}

function preencherSugestaoDeDominio() {
  const rawUrl = ui.companyUrl.value.trim() || ui.companySite.value.trim()
  if (!rawUrl) {
    showToast('Insere um dominio para gerar uma sugestao local.', { type: 'warning' })
    return
  }

  let parsed
  try {
    parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
  } catch (error) {
    showToast('O dominio introduzido nao parece valido.', { type: 'error' })
    return
  }

  const hostParts = parsed.hostname.replace(/^www\./, '').split('.').filter(Boolean)
  const brand = hostParts.length ? hostParts[0].replace(/[-_]+/g, ' ') : 'Empresa'
  const suggestionName = brand
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')

  ui.companyName.value = ui.companyName.value.trim() || suggestionName
  ui.companySite.value = parsed.origin
  ui.companyLogo.value = ui.companyLogo.value.trim() || new URL('/favicon.ico', parsed.origin).href

  if (!ui.companyBio.value.trim()) {
    ui.companyBio.value = `${suggestionName} marca a sua presenca no ecossistema BoardSports com produtos e servicos ligados ao universo de prancha.`
  }

  atualizarPreview()
  showToast('Sugestao local aplicada. Ajusta os campos antes de guardar.', { type: 'success' })
}

function atualizarPreview() {
  const name = ui.companyName.value.trim() || 'Empresa'
  const site = ui.companySite.value.trim() || 'boardsports.company'
  const bio = ui.companyBio.value.trim() || 'A descricao publica da empresa aparece aqui assim que comecares a preencher o perfil.'
  const logo = ui.companyLogo.value.trim()

  ui.previewName.textContent = name
  ui.previewSite.textContent = site.replace(/^https?:\/\//, '')
  ui.previewBio.textContent = bio
  ui.brandLabel.textContent = name

  if (logo) {
    ui.previewLogo.src = logo
  } else {
    ui.previewLogo.removeAttribute('src')
  }
}

async function guardarPerfil() {
  const updates = {
    nome: ui.companyName.value.trim(),
    website_url: ui.companySite.value.trim(),
    foto_perfil: ui.companyLogo.value.trim(),
    bio: ui.companyBio.value.trim()
  }

  const result = await atualizarPerfil(state.user.id, updates)
  if (!result) {
    showToast('Nao foi possivel guardar o perfil da empresa.', { type: 'error' })
    return
  }

  state.user.perfil = { ...state.user.perfil, ...result }
  atualizarPreview()
  window.dispatchEvent(new CustomEvent('boardsports:header-sync'))
  showToast('Perfil da empresa atualizado com sucesso.', { type: 'success' })
}

async function onSubmitProduto(event) {
  event.preventDefault()

  const productId = Number(ui.productId.value)
  const payload = {
    empresa_id: state.user.id,
    nome: ui.productName.value.trim(),
    descricao: ui.productDescription.value.trim(),
    preco: Number.parseFloat(ui.productPrice.value),
    stock: Number.parseInt(ui.productStock.value || '0', 10),
    modalidade_id: Number.parseInt(ui.productModalidade.value, 10),
    imagem: ui.productImage.value.trim() || null
  }

  if (!payload.nome || !payload.modalidade_id || !Number.isFinite(payload.preco)) {
    showToast('Preenche nome, modalidade e preco antes de guardar.', { type: 'warning' })
    return
  }

  const result = productId
    ? await atualizarProduto(productId, payload)
    : await criarProduto(payload)

  if (!result) {
    showToast('Nao foi possivel guardar o produto.', { type: 'error' })
    return
  }

  resetProductForm()
  await carregarProdutosEmpresa()
  showToast(productId ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', { type: 'success' })
}

async function onProductListClick(event) {
  const editButton = event.target.closest('[data-edit-product]')
  if (editButton) {
    const productId = Number(editButton.dataset.editProduct)
    preencherProdutoParaEdicao(productId)
    return
  }

  const deleteButton = event.target.closest('[data-delete-product]')
  if (deleteButton) {
    const productId = Number(deleteButton.dataset.deleteProduct)
    const product = state.produtos.find((item) => item.id === productId)
    if (!product) return

    const confirmed = await showConfirm({
      title: 'Apagar produto',
      message: `Queres remover "${product.nome}" do catalogo?`,
      confirmText: 'Apagar',
      danger: true
    })

    if (!confirmed) return

    const success = await apagarProduto(productId)
    if (!success) {
      showToast('Nao foi possivel apagar o produto.', { type: 'error' })
      return
    }

    if (Number(ui.productId.value) === productId) {
      resetProductForm()
    }

    await carregarProdutosEmpresa()
    showToast('Produto removido do catalogo.', { type: 'success' })
  }
}

async function onOrderListClick(event) {
  const button = event.target.closest('[data-save-order-status]')
  if (!button) return

  const orderId = Number(button.dataset.saveOrderStatus)
  const select = ui.orderList.querySelector(`[data-order-status-select="${orderId}"]`)
  const nextStatus = select?.value

  if (!nextStatus || !ORDER_STATUSES.includes(nextStatus)) {
    showToast('Seleciona um estado valido antes de guardar.', { type: 'warning' })
    return
  }

  const result = await atualizarPedidoStatus(orderId, nextStatus)
  if (!result) {
    showToast('Nao foi possivel atualizar o estado do pedido.', { type: 'error' })
    return
  }

  await carregarPedidosEmpresa()
  showToast(`Pedido #${orderId} atualizado para ${formatOrderStatus(nextStatus)}.`, { type: 'success' })
}

function preencherProdutoParaEdicao(productId) {
  const product = state.produtos.find((item) => item.id === productId)
  if (!product) return

  ui.productId.value = product.id
  ui.productName.value = product.nome || ''
  ui.productPrice.value = product.preco ?? ''
  ui.productStock.value = product.stock ?? 0
  ui.productModalidade.value = product.modalidade_id || ''
  ui.productImage.value = product.imagem || ''
  ui.productDescription.value = product.descricao || ''
  ui.productSubmit.textContent = 'Guardar alteracoes'
  ui.productCancel.hidden = false
  setActiveTab('produtos')
}

function resetProductForm() {
  ui.productForm.reset()
  ui.productId.value = ''
  ui.productSubmit.textContent = 'Adicionar produto'
  ui.productCancel.hidden = true
}

function renderProdutosEmpresa() {
  ui.productCount.textContent = `${state.produtos.length} produtos`

  const totalStock = state.produtos.reduce((sum, item) => sum + Number(item.stock || 0), 0)
  ui.stockSummary.textContent = totalStock
    ? `${totalStock} unidades em stock`
    : 'Sem stock registado'

  if (!state.produtos.length) {
    ui.productList.innerHTML = `
      <article class="company-preview-card">
        <p>Ainda nao tens produtos publicados. Cria o primeiro no formulario ao lado.</p>
      </article>
    `
    return
  }

  ui.productList.innerHTML = state.produtos.map((product) => {
    const imageStyle = product.imagem
      ? `style="background-image: linear-gradient(180deg, rgba(7, 10, 16, 0.16), rgba(7, 10, 16, 0.72)), url('${escapeAttribute(product.imagem)}')"`
      : ''

    return `
      <article class="company-product-card">
        <div class="company-product-image" ${imageStyle}>${product.imagem ? '' : getProductGlyph(product.modalidades?.nome)}</div>
        <div>
          <h4>${escapeHtml(product.nome)}</h4>
          <p>${escapeHtml(buildExcerpt(product.descricao))}</p>
          <div class="company-product-meta">
            <strong>${formatCurrency(product.preco)}</strong>
            <span>Stock: ${product.stock ?? 0}</span>
            <span>${escapeHtml(product.modalidades?.nome || 'Sem modalidade')}</span>
          </div>
          <div class="company-product-actions">
            <button type="button" class="company-secondary-button" data-edit-product="${product.id}">Editar</button>
            <button type="button" class="company-secondary-button" data-delete-product="${product.id}">Apagar</button>
          </div>
        </div>
      </article>
    `
  }).join('')
}

function renderPedidosEmpresa() {
  ui.orderCount.textContent = `${state.pedidos.length} ${state.pedidos.length === 1 ? 'pedido' : 'pedidos'}`

  if (!state.pedidos.length) {
    ui.orderList.innerHTML = `
      <article class="company-preview-card">
        <p>Ainda nao entraram pedidos para esta empresa.</p>
      </article>
    `
    return
  }

  ui.orderList.innerHTML = state.pedidos.map((pedido) => `
    <article class="company-order-card">
      <div class="company-order-head">
        <div>
          <h3>Pedido #${pedido.id}</h3>
          <p>${formatDate(pedido.data_pedido)} | ${escapeHtml(pedido.cliente?.nome || pedido.cliente?.email || 'Cliente')}</p>
        </div>
        <div>
          <span class="company-order-status" data-status="${pedido.status || 'pendente'}">${formatOrderStatus(pedido.status)}</span>
          <strong>${formatCurrency(pedido.valor_total)}</strong>
        </div>
      </div>

      <div class="company-order-meta">
        <span>${escapeHtml(pedido.endereco_entrega || 'Sem endereco de entrega')}</span>
        ${pedido.notas ? `<span>${escapeHtml(pedido.notas)}</span>` : ''}
        ${pedido.data_entrega ? `<span>Entregue em ${formatDate(pedido.data_entrega)}</span>` : ''}
      </div>

      <div class="company-order-items">
        ${(pedido.items || []).map((item) => `
          <span>${item.quantidade}x ${escapeHtml(item.produto?.nome || 'Produto')}</span>
        `).join('')}
      </div>

      <div class="company-order-actions">
        <select data-order-status-select="${pedido.id}">
          ${ORDER_STATUSES.map((status) => `
            <option value="${status}" ${status === pedido.status ? 'selected' : ''}>${formatOrderStatus(status)}</option>
          `).join('')}
        </select>
        <button type="button" class="company-primary-button" data-save-order-status="${pedido.id}">Guardar estado</button>
      </div>
    </article>
  `).join('')
}

function buildExcerpt(text = '') {
  if (!text) return 'Produto sem descricao detalhada.'
  return text.length > 140 ? `${text.slice(0, 137).trim()}...` : text
}

function getProductGlyph(modalidade = '') {
  const lower = String(modalidade || '').toLowerCase()
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

function formatDate(value) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleString('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function formatOrderStatus(status = 'pendente') {
  const labels = {
    pendente: 'Pendente',
    processando: 'Processando',
    enviado: 'Enviado',
    entregue: 'Entregue',
    cancelado: 'Cancelado'
  }

  return labels[status] || 'Pendente'
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

document.addEventListener('DOMContentLoaded', initEmpresaPage)
