import { inicializarPaginaProtegida, obterUsuarioAtual } from './auth_utils.js'
import {
  inscreverEvento,
  obterEstatisticasDashboard,
  obterEventos,
  obterInscricoesUsuario,
  obterModalidades
} from './db_utils.js'
import { showToast } from './ui_feedback.js'

const state = {
  user: null,
  stats: null,
  modalidades: [],
  eventos: [],
  inscricoes: []
}

const ui = {
  greeting: null,
  subtitle: null,
  roleLabel: null,
  adminSummary: null,
  totalProdutos: null,
  totalEventos: null,
  totalEmpresas: null,
  totalAtletas: null,
  modalidadesContainer: null,
  eventosContainer: null,
  adminPanel: null,
  pendingCount: null
}

async function inicializarDashboard() {
  const autenticado = await inicializarPaginaProtegida()
  if (!autenticado) return

  cacheDom()
  bindEvents()

  state.user = await obterUsuarioAtual()
  await carregarDashboard()
}

function cacheDom() {
  ui.greeting = document.getElementById('dashboard-greeting')
  ui.subtitle = document.getElementById('dashboard-subtitle')
  ui.roleLabel = document.getElementById('dashboard-role-label')
  ui.adminSummary = document.getElementById('dashboard-admin-summary')
  ui.totalProdutos = document.getElementById('total-produtos')
  ui.totalEventos = document.getElementById('total-eventos')
  ui.totalEmpresas = document.getElementById('total-empresas')
  ui.totalAtletas = document.getElementById('total-atletas')
  ui.modalidadesContainer = document.getElementById('modalidades-container')
  ui.eventosContainer = document.getElementById('dashboard-eventos')
  ui.adminPanel = document.getElementById('dashboard-admin-panel')
  ui.pendingCount = document.getElementById('dashboard-pending-count')
}

function bindEvents() {
  ui.eventosContainer.addEventListener('click', onEventListClick)
}

async function carregarDashboard() {
  const [stats, modalidades, eventos, inscricoes] = await Promise.all([
    obterEstatisticasDashboard(),
    obterModalidades(),
    obterEventos({ proximo: true }),
    state.user ? obterInscricoesUsuario(state.user.id) : Promise.resolve([])
  ])

  state.stats = stats
  state.modalidades = modalidades
  state.eventos = eventos.slice(0, 6)
  state.inscricoes = inscricoes

  renderHeader()
  renderStats()
  renderModalidades()
  renderEventos()
  renderAdminPanel()
}

function renderHeader() {
  const displayName = state.user?.perfil?.nome || state.user?.email || 'membro'
  const role = state.user?.perfil?.role || 'membro'

  ui.greeting.textContent = `Bem-vindo, ${displayName}.`
  ui.subtitle.textContent = role === 'empresa'
    ? 'O dashboard mostra o estado atual da plataforma e ajuda-te a navegar para catalogo, eventos e moderacao.'
    : 'O dashboard junta estatisticas, modalidades e eventos para continuares a navegar sem perder contexto.'
  ui.roleLabel.textContent = role
  ui.adminSummary.textContent = state.user?.perfil?.is_admin
    ? `${state.stats?.pendentesModeracao || 0} pedidos pendentes`
    : 'Sem alertas de moderacao'
}

function renderStats() {
  ui.totalProdutos.textContent = state.stats?.produtos ?? 0
  ui.totalEventos.textContent = state.stats?.eventos ?? 0
  ui.totalEmpresas.textContent = state.stats?.empresas ?? 0
  ui.totalAtletas.textContent = state.stats?.atletas ?? 0
}

function renderModalidades() {
  if (!state.modalidades.length) {
    ui.modalidadesContainer.innerHTML = '<article class="dashboard-empty-card"><p>Nenhuma modalidade ativa neste momento.</p></article>'
    return
  }

  ui.modalidadesContainer.innerHTML = state.modalidades.map((modalidade) => `
    <article class="dashboard-modalidade-card">
      <span>${escapeHtml(modalidade.nome)}</span>
      <h3>${escapeHtml(modalidade.nome)}</h3>
      <p>${escapeHtml(buildExcerpt(modalidade.descricao, 120))}</p>
      <a class="dashboard-link-button" href="/produtos.html?modalidade=${modalidade.id}">Ver mercado</a>
    </article>
  `).join('')
}

function renderEventos() {
  if (!state.eventos.length) {
    ui.eventosContainer.innerHTML = '<article class="dashboard-empty-card"><p>Nao existem eventos ativos para mostrar.</p></article>'
    return
  }

  const inscricoesSet = new Set(state.inscricoes.map((inscricao) => inscricao.evento_id))
  const canRegister = state.user?.perfil?.role !== 'empresa'

  ui.eventosContainer.innerHTML = state.eventos.map((evento) => {
    const alreadyRegistered = inscricoesSet.has(evento.id)
    const disabled = !canRegister || alreadyRegistered
    const buttonLabel = !canRegister
      ? 'Empresas nao se inscrevem'
      : alreadyRegistered
        ? 'Ja inscrito'
        : 'Inscrever-me'

    return `
      <article class="dashboard-event-card">
        <header>
          <div>
            <span class="dashboard-tag">${escapeHtml(evento.modalidade || 'Evento')}</span>
            <h3>${escapeHtml(evento.nome)}</h3>
          </div>
          <button type="button" class="dashboard-action" data-register-event="${evento.id}" ${disabled ? 'disabled' : ''}>
            ${buttonLabel}
          </button>
        </header>
        <div class="dashboard-event-meta">
          <span>${formatDate(evento.data_inicio)}</span>
          <span>${escapeHtml(evento.localidade || 'Localidade por definir')}</span>
          <span>Por ${escapeHtml(evento.criador_nome || 'utilizador')}</span>
        </div>
        <p>${escapeHtml(buildExcerpt(evento.descricao, 150))}</p>
      </article>
    `
  }).join('')
}

function renderAdminPanel() {
  if (!state.user?.perfil?.is_admin) {
    ui.adminPanel.hidden = true
    return
  }

  ui.adminPanel.hidden = false
  const count = state.stats?.pendentesModeracao || 0
  ui.pendingCount.textContent = `${count} ${count === 1 ? 'pedido pendente' : 'pedidos pendentes'}`
}

async function onEventListClick(event) {
  const button = event.target.closest('[data-register-event]')
  if (!button) return

  const eventoId = Number(button.dataset.registerEvent)
  if (!eventoId || !state.user) return

  button.disabled = true
  const result = await inscreverEvento(eventoId, state.user.id)

  if (!result) {
    button.disabled = false
    showToast('Nao foi possivel concluir a inscricao neste evento.', { type: 'error' })
    return
  }

  state.inscricoes = await obterInscricoesUsuario(state.user.id)
  renderEventos()
  showToast('Inscricao confirmada no evento.', { type: 'success' })
}

function buildExcerpt(text = '', limit = 110) {
  if (!text) return 'Sem descricao detalhada.'
  return text.length > limit ? `${text.slice(0, limit - 3).trim()}...` : text
}

function formatDate(value) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleString('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

document.addEventListener('DOMContentLoaded', inicializarDashboard)
