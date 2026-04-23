import { obterModalidades, obterCategoriasPorModalidade } from './db_utils.js'

const modalidadeMeta = {
  Surf: {
    emoji: '🏄',
    gradient: 'linear-gradient(135deg, #0c7abf 0%, #14b8ff 46%, #ffb703 100%)',
    chip: 'Agua e leitura de ondas',
    terrain: 'Costa e mar',
    focus: 'Linhas, leitura e fluidez',
    energy: 'Alta'
  },
  Skate: {
    emoji: '🛹',
    gradient: 'linear-gradient(135deg, #1f1f24 0%, #50555c 44%, #ff7b00 100%)',
    chip: 'Rua, park e transicao',
    terrain: 'Cidade e skatepark',
    focus: 'Truques e precisao',
    energy: 'Alta'
  },
  Skimboard: {
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, #153243 0%, #2d8f85 48%, #ffd166 100%)',
    chip: 'Praia rasa e resposta rapida',
    terrain: 'Areia molhada',
    focus: 'Aceleracao e timing',
    energy: 'Media-alta'
  },
  Snowboard: {
    emoji: '🏂',
    gradient: 'linear-gradient(135deg, #183153 0%, #4f6d8c 48%, #dfe7f3 100%)',
    chip: 'Neve, park e montanha',
    terrain: 'Pistas e backcountry',
    focus: 'Controle e adaptacao',
    energy: 'Alta'
  },
  Sandboard: {
    emoji: '🏜️',
    gradient: 'linear-gradient(135deg, #5a3718 0%, #c07a2d 50%, #f2c078 100%)',
    chip: 'Dunas e descida tecnica',
    terrain: 'Areia seca',
    focus: 'Equilibrio e leitura da inclinacao',
    energy: 'Media'
  }
}

const fallbackMeta = {
  emoji: '🏄',
  gradient: 'linear-gradient(135deg, #2b2b31 0%, #43454f 45%, #ff8c00 100%)',
  chip: 'Disciplina em destaque',
  terrain: 'Terreno variavel',
  focus: 'Tecnica e progressao',
  energy: 'Media'
}

const state = {
  modalidades: [],
  activeId: null,
  lastFocusedElement: null
}

const ui = {
  container: null,
  overlay: null,
  dialog: null,
  backdrop: null,
  closeButton: null,
  closeAction: null,
  modalHero: null,
  modalChip: null,
  modalEmoji: null,
  modalTitle: null,
  modalDescription: null,
  modalSummary: null,
  modalFacts: null,
  modalCategories: null,
  modalNextStep: null,
  modalLink: null
}

async function inicializarModalidades() {
  cacheDom()
  bindEvents()
  await carregarModalidades()
}

function cacheDom() {
  ui.container = document.getElementById('modalidades-container')
  ui.overlay = document.getElementById('modalidade-overlay')
  ui.dialog = document.getElementById('modalidade-dialog')
  ui.backdrop = document.getElementById('modalidade-overlay-backdrop')
  ui.closeButton = document.getElementById('modalidade-close')
  ui.closeAction = document.getElementById('modalidade-modal-close-action')
  ui.modalHero = document.getElementById('modalidade-modal-hero')
  ui.modalChip = document.getElementById('modalidade-modal-chip')
  ui.modalEmoji = document.getElementById('modalidade-modal-emoji')
  ui.modalTitle = document.getElementById('modalidade-modal-title')
  ui.modalDescription = document.getElementById('modalidade-modal-description')
  ui.modalSummary = document.getElementById('modalidade-modal-summary')
  ui.modalFacts = document.getElementById('modalidade-modal-facts')
  ui.modalCategories = document.getElementById('modalidade-modal-categories')
  ui.modalNextStep = document.getElementById('modalidade-modal-next-step')
  ui.modalLink = document.getElementById('modalidade-modal-link')
}

function bindEvents() {
  ui.container.addEventListener('click', onCardClick)
  ui.container.addEventListener('keydown', onCardKeydown)
  ui.backdrop.addEventListener('click', fecharModal)
  ui.closeButton.addEventListener('click', fecharModal)
  ui.closeAction.addEventListener('click', fecharModal)
  document.addEventListener('keydown', onDocumentKeydown)
}

async function carregarModalidades() {
  try {
    const modalidades = await obterModalidades()

    if (!modalidades.length) {
      renderEmptyState('Nenhuma modalidade encontrada.')
      return
    }

    const categoriasPorModalidade = await Promise.all(
      modalidades.map(modalidade => obterCategoriasPorModalidade(modalidade.id))
    )

    state.modalidades = modalidades.map((modalidade, index) => {
      const categorias = categoriasPorModalidade[index] || []
      return {
        ...modalidade,
        categorias,
        meta: obterMetaModalidade(modalidade.nome)
      }
    })

    renderCards()
  } catch (error) {
    console.error('Erro ao carregar modalidades:', error)
    renderEmptyState('Nao foi possivel carregar as modalidades neste momento.')
  }
}

function renderCards() {
  ui.container.innerHTML = state.modalidades.map(modalidade => {
    const previewCategorias = modalidade.categorias.slice(0, 3)
    const extraCategorias = Math.max(modalidade.categorias.length - previewCategorias.length, 0)
    const resumo = construirResumoCurto(modalidade)
    const cardStyle = `--card-gradient:${modalidade.meta.gradient};`

    return `
      <article
        class="modalidade-card"
        data-modalidade-id="${modalidade.id}"
        tabindex="0"
        role="button"
        aria-label="Abrir detalhe de ${escapeHtml(modalidade.nome)}"
        style="${cardStyle}">
        <div class="modalidade-visual">
          <div class="modalidade-emoji">${modalidade.meta.emoji}</div>
          <div class="modalidade-count">${modalidade.categorias.length} categorias</div>
        </div>

        <div class="modalidade-body">
          <div class="modalidade-copy">
            <h3>${escapeHtml(modalidade.nome)}</h3>
            <p>${escapeHtml(resumo)}</p>
          </div>

          <div class="modalidade-tags">
            ${renderPreviewCategorias(previewCategorias, extraCategorias)}
          </div>

          <div class="modalidade-footer">
            <div>
              <span>Terreno</span><br>
              <strong>${escapeHtml(modalidade.meta.terrain)}</strong>
            </div>
            <div class="modalidade-action">Abrir detalhe</div>
          </div>
        </div>
      </article>
    `
  }).join('')
}

function renderPreviewCategorias(previewCategorias, extraCategorias) {
  if (!previewCategorias.length) {
    return '<span>Categorias em definicao</span>'
  }

  const tags = previewCategorias
    .map(categoria => `<span>${escapeHtml(categoria.nome)}</span>`)
    .join('')

  if (!extraCategorias) {
    return tags
  }

  return `${tags}<span>+${extraCategorias} extra</span>`
}

function renderEmptyState(message) {
  ui.container.innerHTML = `<div class="modalidades-empty">${escapeHtml(message)}</div>`
}

function onCardClick(event) {
  const card = event.target.closest('[data-modalidade-id]')
  if (!card) return

  abrirModal(Number(card.dataset.modalidadeId))
}

function onCardKeydown(event) {
  const card = event.target.closest('[data-modalidade-id]')
  if (!card) return

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    abrirModal(Number(card.dataset.modalidadeId))
  }
}

function onDocumentKeydown(event) {
  if (event.key === 'Escape' && state.activeId !== null) {
    fecharModal()
  }
}

function abrirModal(modalidadeId) {
  const modalidade = state.modalidades.find(item => item.id === modalidadeId)
  if (!modalidade) return

  state.activeId = modalidadeId
  state.lastFocusedElement = document.activeElement

  preencherModal(modalidade)
  ui.overlay.classList.add('is-visible')
  ui.overlay.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')
  ui.dialog.focus()
}

function fecharModal() {
  if (state.activeId === null) return

  state.activeId = null
  ui.overlay.classList.remove('is-visible')
  ui.overlay.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('modal-open')

  if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
    state.lastFocusedElement.focus()
  }
}

function preencherModal(modalidade) {
  const resumoLongo = construirResumoLongo(modalidade)
  const proximoPasso = construirProximoPasso(modalidade)
  const facts = construirIndicadores(modalidade)

  ui.modalHero.style.setProperty('--modal-gradient', modalidade.meta.gradient)
  ui.modalChip.textContent = modalidade.meta.chip
  ui.modalEmoji.textContent = modalidade.meta.emoji
  ui.modalTitle.textContent = modalidade.nome
  ui.modalDescription.textContent = modalidade.descricao || 'Disciplina sem descricao detalhada.'
  ui.modalSummary.textContent = resumoLongo
  ui.modalNextStep.textContent = proximoPasso
  ui.modalLink.href = `produtos.html?modalidade=${modalidade.id}`
  ui.modalLink.textContent = `Ver produtos de ${modalidade.nome}`
  ui.modalLink.setAttribute('aria-label', `Ver produtos da modalidade ${modalidade.nome}`)

  ui.modalFacts.innerHTML = facts.map(fact => `
    <div class="modalidade-fact">
      <span>${escapeHtml(fact.label)}</span>
      <strong>${escapeHtml(fact.value)}</strong>
    </div>
  `).join('')

  if (modalidade.categorias.length) {
    ui.modalCategories.innerHTML = modalidade.categorias
      .map(categoria => `<span>${escapeHtml(categoria.nome)}</span>`)
      .join('')
  } else {
    ui.modalCategories.innerHTML = '<span>Categorias em definicao</span>'
  }
}

function construirResumoCurto(modalidade) {
  const descricao = modalidade.descricao || 'Exploracao tecnica e progressao.'
  if (descricao.length <= 105) return descricao
  return `${descricao.slice(0, 102).trim()}...`
}

function construirResumoLongo(modalidade) {
  const categorias = modalidade.categorias.map(categoria => categoria.nome)
  const preview = categorias.slice(0, 4).join(', ')
  const extra = Math.max(categorias.length - 4, 0)
  const descricao = modalidade.descricao || 'Esta disciplina ainda nao tem uma descricao detalhada na plataforma.'

  if (!preview) {
    return `${descricao} O catalogo desta modalidade ainda esta a ser organizado, por isso o proximo passo natural e entrar no mercado e acompanhar as futuras adicoes.`
  }

  return `${descricao} Neste momento a modalidade ja inclui categorias como ${preview}${extra ? ` e mais ${extra}` : ''}, o que permite navegar por estilos e necessidades tecnicas diferentes sem sair do mesmo fluxo.`
}

function construirProximoPasso(modalidade) {
  if (!modalidade.categorias.length) {
    return `Abre o mercado de ${modalidade.nome} para acompanhar quando surgirem produtos e novas categorias nesta area.`
  }

  const primeiraCategoria = modalidade.categorias[0].nome
  return `Entra no mercado de ${modalidade.nome} e comeca pela categoria ${primeiraCategoria} se queres uma entrada rapida neste universo.`
}

function construirIndicadores(modalidade) {
  return [
    {
      label: 'Categorias',
      value: String(modalidade.categorias.length)
    },
    {
      label: 'Terreno',
      value: modalidade.meta.terrain
    },
    {
      label: 'Foco tecnico',
      value: modalidade.meta.focus
    },
    {
      label: 'Intensidade',
      value: modalidade.meta.energy
    }
  ]
}

function obterMetaModalidade(nome) {
  return modalidadeMeta[nome] || fallbackMeta
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

document.addEventListener('DOMContentLoaded', inicializarModalidades)
