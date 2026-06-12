import { inicializarPaginaProtegida, obterUsuarioAtual } from './auth_utils.js'
import {
  aplicarTimeoutUsuarioModeracao,
  banirUsuarioModeracao,
  excluirSpotModeracao,
  moderarDenuncia,
  moderarSolicitacaoPublicacao,
  moderarSubmissãoXp,
  obterDenunciasModeracao,
  obterSubmissoesModeracao,
  obterSolicitacoesPublicacao
} from './db_utils.js'
import { showConfirm, showToast } from './ui_feedback.js'

const state = {
  user: null,
  solicitacoes: [],
  submissoesXp: [],
  denuncias: [],
  filters: {
    status: 'pendente',
    search: ''
  }
}

const ui = {
  count: null,
  userLabel: null,
  summary: null,
  list: null,
  refresh: null,
  statusFilter: null,
  search: null,
  pendingCount: null,
  approvedCount: null,
  rejectedCount: null,
  xpRefresh: null,
  xpList: null,
  reportsRefresh: null,
  reportsList: null
}

async function initModeraçãoPage() {
  const autenticado = await inicializarPaginaProtegida()
  if (!autenticado) return

  cacheDom()
  bindEvents()

  state.user = await obterUsuarioAtual()
  if (!isAllowedAdmin(state.user)) {
    renderAccessDenied()
    return
  }

  document.querySelector('.moderation-shell')?.setAttribute('data-admin-state', 'ready')
  ui.userLabel.textContent = state.user.perfil?.nome || state.user.email || 'Admin'
  await Promise.all([
    carregarSolicitacoes(),
    carregarSubmissoesXp(),
    carregarDenuncias()
  ])
}

function isAllowedAdmin(user) {
  return user?.perfil?.is_admin === true
}

function cacheDom() {
  ui.count = document.getElementById('moderation-count')
  ui.userLabel = document.getElementById('moderation-user-label')
  ui.summary = document.getElementById('moderation-summary')
  ui.list = document.getElementById('moderation-list')
  ui.refresh = document.getElementById('moderation-refresh')
  ui.statusFilter = document.getElementById('moderation-status-filter')
  ui.search = document.getElementById('moderation-search')
  ui.pendingCount = document.getElementById('moderation-pending-count')
  ui.approvedCount = document.getElementById('moderation-approved-count')
  ui.rejectedCount = document.getElementById('moderation-rejected-count')
  ui.xpRefresh = document.getElementById('xp-submissions-refresh')
  ui.xpList = document.getElementById('xp-submissions-list')
  ui.reportsRefresh = document.getElementById('reports-refresh')
  ui.reportsList = document.getElementById('reports-list')
}

function bindEvents() {
  ui.refresh.addEventListener('click', carregarSolicitacoes)
  ui.list.addEventListener('click', onModerationListClick)
  ui.xpRefresh.addEventListener('click', carregarSubmissoesXp)
  ui.xpList.addEventListener('click', onXpSubmissionClick)
  ui.reportsRefresh?.addEventListener('click', carregarDenuncias)
  ui.reportsList?.addEventListener('click', onReportClick)
  ui.statusFilter.addEventListener('change', (event) => {
    state.filters.status = event.target.value
    renderSolicitacoes()
  })
  ui.search.addEventListener('input', (event) => {
    state.filters.search = event.target.value.trim().toLowerCase()
    renderSolicitacoes()
  })
}

async function carregarDenuncias() {
  state.denuncias = await obterDenunciasModeracao({ estado: 'pendente' })
  renderDenuncias()
}

function renderAccessDenied() {
  const shell = document.querySelector('.moderation-shell')
  if (!shell) return

  shell.setAttribute('data-admin-state', 'denied')
  shell.innerHTML = `
    <section class="moderation-hero">
      <div>
        <span class="moderation-kicker">Acesso restrito</span>
        <h1>Esta área é exclusiva para administradores.</h1>
        <p>Usa uma conta com permissão administrativa para rever pedidos de publicação e consultar o histórico da moderação.</p>
      </div>
      <div class="moderation-hero-card">
        <strong>Sem permissão</strong>
        <span>Perfil atual bloqueado</span>
        <p>Se a tua conta acabou de receber permissão de admin, termina sessão e volta a entrar.</p>
      </div>
    </section>
  `
}

async function carregarSolicitacoes() {
  state.solicitacoes = await obterSolicitacoesPublicacao({})
  renderSolicitacoes()
}

async function carregarSubmissoesXp() {
  try {
    state.submissoesXp = await obterSubmissoesModeracao({ estado: 'pendente' })
    renderSubmissoesXp()
  } catch (error) {
    console.warn('Sistema XP indisponível na moderação:', error)
    ui.xpList.innerHTML = `
      <article class="moderation-empty-card">
        <p>O sistema de XP ainda não foi aplicado a esta base de dados.</p>
        <p>Aplica as migrations da pasta <code>backend/supabase/migrations</code> para ativar as submissões XP.</p>
      </article>
    `
  }
}

function getFilteredSolicitacoes() {
  const status = state.filters.status
  const search = state.filters.search

  return state.solicitacoes.filter((solicitacao) => {
    const matchesStatus = status === 'todos' ? true : solicitacao.status === status
    if (!matchesStatus) return false

    if (!search) return true

    const haystack = [
      solicitacao.spot?.nome,
      solicitacao.spot?.descricao,
      solicitacao.spot?.modalidades?.nome,
      solicitacao.spot?.categorias?.nome,
      solicitacao.usuario?.nome,
      solicitacao.usuario?.email
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search)
  })
}

function renderSolicitacoes() {
  const pending = state.solicitacoes.filter((item) => item.status === 'pendente').length
  const approved = state.solicitacoes.filter((item) => item.status === 'aprovado').length
  const rejected = state.solicitacoes.filter((item) => item.status === 'rejeitado').length
  const filtered = getFilteredSolicitacoes()

  ui.pendingCount.textContent = String(pending)
  ui.approvedCount.textContent = String(approved)
  ui.rejectedCount.textContent = String(rejected)
  ui.count.textContent = `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`
  ui.summary.textContent = `${pending} pendentes, ${approved} aprovados e ${rejected} rejeitados no histórico atual.`

  if (!filtered.length) {
    ui.list.innerHTML = '<article class="moderation-empty-card"><p>Não existem resultados para os filtros atuais.</p></article>'
    return
  }

  ui.list.innerHTML = filtered.map((solicitacao) => {
    const isPending = solicitacao.status === 'pendente'
    const note = escapeHtml(solicitacao.mensagem_admin || '')
    const historyBlock = !isPending
      ? `
        <div class="moderation-history-note">
          <strong>${solicitacao.status === 'aprovado' ? 'Decisao: aprovado' : 'Decisao: rejeitado'}</strong>
          <p>${solicitacao.data_decisao ? `Atualizado em ${formatDate(solicitacao.data_decisao)}.` : 'Sem data de decisao registada.'}</p>
          <p>${note || 'Sem nota administrativa registada.'}</p>
        </div>
      `
      : ''

    const noteField = isPending
      ? `
        <label class="moderation-field">
          <span>Nota de moderação</span>
          <textarea rows="3" data-admin-note="${solicitacao.id}" placeholder="Mensagem opcional para o pedido">${note}</textarea>
        </label>
      `
      : ''

    const actionButtons = isPending
      ? `
        <div class="moderation-actions">
          <button type="button" class="moderation-primary-button" data-approve="${solicitacao.id}">Aprovar spot</button>
          <button type="button" class="moderation-danger-button" data-reject="${solicitacao.id}">Rejeitar pedido</button>
        </div>
      `
      : ''

    return `
      <article class="moderation-card">
        <div class="moderation-card-top">
          <div>
            <h3>${escapeHtml(solicitacao.spot?.nome || 'Spot sem nome')}</h3>
            <p>${escapeHtml(buildExcerpt(solicitacao.spot?.descricao, 180))}</p>
          </div>
          <span class="moderation-status-badge" data-status="${solicitacao.status}">${escapeHtml(solicitacao.status || 'pendente')}</span>
        </div>

        <div class="moderation-card-meta">
          <span>Autor: ${escapeHtml(solicitacao.usuario?.nome || solicitacao.usuario?.email || 'Utilizador')}</span>
          <span>${escapeHtml(solicitacao.spot?.modalidades?.nome || 'Modalidade')}</span>
          <span>${escapeHtml(solicitacao.spot?.categorias?.nome || 'Sem categoria')}</span>
          <span>${formatCoordinates(solicitacao.spot)}</span>
          <span>${formatDate(solicitacao.data_criacao)}</span>
        </div>

        ${noteField}
        ${historyBlock}
        ${actionButtons}
      </article>
    `
  }).join('')
}

async function onModerationListClick(event) {
  const approve = event.target.closest('[data-approve]')
  const reject = event.target.closest('[data-reject]')
  if (!approve && !reject) return

  const solicitacaoId = Number((approve || reject).dataset.approve || (approve || reject).dataset.reject)
  const status = approve ? 'aprovado' : 'rejeitado'
  const noteInput = ui.list.querySelector(`[data-admin-note="${solicitacaoId}"]`)
  const note = noteInput?.value.trim() || ''

  const confirmed = await showConfirm({
    title: status === 'aprovado' ? 'Aprovar spot' : 'Rejeitar solicitacao',
    message: status === 'aprovado'
      ? 'Queres tornar este spot público no mapa?'
      : 'Queres rejeitar esta solicitação de publicação?',
    confirmText: status === 'aprovado' ? 'Aprovar' : 'Rejeitar',
    danger: status === 'rejeitado'
  })

  if (!confirmed) return

  const result = await moderarSolicitacaoPublicacao(solicitacaoId, status, note)
  if (!result) {
    showToast('Não foi possível atualizar a solicitacao.', { type: 'error' })
    return
  }

  await carregarSolicitacoes()
  showToast(status === 'aprovado' ? 'Spot aprovado e publicado.' : 'Solicitacao rejeitada.', { type: 'success' })
}

function renderSubmissoesXp() {
  const items = state.submissoesXp || []

  if (!items.length) {
    ui.xpList.innerHTML = '<article class="moderation-empty-card"><p>Não existem submissões XP pendentes.</p></article>'
    return
  }

  ui.xpList.innerHTML = items.map((submissao) => {
    const suspicious = Number(submissao.distancia_spot_metros || 0) > 100
    const provaUrl = submissao.prova_url || ''

    return `
      <article class="moderation-card ${suspicious ? 'is-suspicious' : ''}">
        <div class="moderation-card-top">
          <div>
            <h3>${escapeHtml(buildXpSubmissionTitle(submissao))}</h3>
            <p>${escapeHtml(submissao.usuario?.nome || submissao.usuario?.email || 'Utilizador')} submeteu uma prova para validação XP.</p>
          </div>
          <span class="moderation-status-badge" data-status="${suspicious ? 'suspeito' : 'pendente'}">${suspicious ? 'suspeito' : 'pendente'}</span>
        </div>

        <div class="moderation-card-meta">
          <span>Tipo: ${escapeHtml(submissao.tipo || 'submissão')}</span>
          <span>XP previsto: ${Number(submissao.xp_previsto || 0)}</span>
          <span>Distancia: ${Number(submissao.distancia_spot_metros || 0)}m</span>
          <span>${escapeHtml(submissao.spot?.modalidades?.nome || submissao.manobra?.modalidades?.nome || 'Modalidade')}</span>
          <span>${formatDate(submissao.data_submissao)}</span>
        </div>

        ${provaUrl ? `<a class="moderation-proof-link" href="${escapeHtml(provaUrl)}" target="_blank" rel="noopener">Abrir prova</a>` : ''}

        <label class="moderation-field">
          <span>Motivo se rejeitares</span>
          <textarea rows="3" data-xp-note="${submissao.id}" placeholder="Ex: prova insuficiente, fora do spot, duplicado"></textarea>
        </label>

        <div class="moderation-actions">
          <button type="button" class="moderation-primary-button" data-xp-approve="${submissao.id}">Validar e atribuir XP</button>
          <button type="button" class="moderation-danger-button" data-xp-reject="${submissao.id}">Rejeitar</button>
        </div>
      </article>
    `
  }).join('')
}

async function onXpSubmissionClick(event) {
  const approve = event.target.closest('[data-xp-approve]')
  const reject = event.target.closest('[data-xp-reject]')
  if (!approve && !reject) return

  const submissãoId = Number((approve || reject).dataset.xpApprove || (approve || reject).dataset.xpReject)
  const estado = approve ? 'validado' : 'rejeitado'
  const note = ui.xpList.querySelector(`[data-xp-note="${submissãoId}"]`)?.value.trim() || ''

  const confirmed = await showConfirm({
    title: estado === 'validado' ? 'Validar submissão XP' : 'Rejeitar submissão XP',
    message: estado === 'validado'
      ? 'Queres validar esta prova e atribuir XP ao utilizador?'
      : 'Queres rejeitar esta prova sem atribuir XP?',
    confirmText: estado === 'validado' ? 'Validar XP' : 'Rejeitar',
    danger: estado === 'rejeitado'
  })

  if (!confirmed) return

  const result = await moderarSubmissãoXp(submissãoId, estado, note)
  if (!result) {
    showToast('Não foi possível moderar a submissão XP. Confirma se o SQL do XP System já foi aplicado.', { type: 'error' })
    return
  }

  await carregarSubmissoesXp()
  showToast(estado === 'validado' ? 'XP atribuído com sucesso.' : 'Submissão XP rejeitada.', { type: 'success' })
}

function renderDenuncias() {
  const items = state.denuncias || []
  if (!ui.reportsList) return

  if (!items.length) {
    ui.reportsList.innerHTML = '<article class="moderation-empty-card"><p>Não existem denúncias pendentes.</p></article>'
    return
  }

  ui.reportsList.innerHTML = items.map((item) => {
    const targetUserId = getReportTargetUserId(item)
    const spot = item.entidade_tipo === 'spot' ? item.entidade : null
    const targetLabel = getReportTargetLabel(item)

    return `
      <article class="moderation-card">
        <div class="moderation-card-top">
          <div>
            <h3>${escapeHtml(item.motivo || 'Denúncia')}</h3>
            <p>${escapeHtml(item.detalhe || 'Sem detalhe adicional.')}</p>
          </div>
          <span class="moderation-status-badge" data-status="pendente">${escapeHtml(item.estado)}</span>
        </div>
        <div class="moderation-card-meta">
          <span>Tipo: ${escapeHtml(item.entidade_tipo)}</span>
          <span>Alvo: ${escapeHtml(targetLabel)}</span>
          <span>ID: ${escapeHtml(item.entidade_id)}</span>
          <span>Denunciante: ${escapeHtml(item.profiles?.nome || item.profiles?.email || 'Utilizador')}</span>
          <span>${formatDate(item.data_criacao)}</span>
        </div>
        <label class="moderation-field">
          <span>Nota de decisão</span>
          <textarea rows="3" data-report-note="${item.id}" placeholder="Nota opcional para o denunciante ou utilizador alvo"></textarea>
        </label>
        <div class="moderation-actions">
          ${spot ? `<a class="moderation-secondary-button" href="/spot.html?id=${escapeHtml(spot.id)}">Abrir spot</a>` : ''}
          ${spot ? `<button type="button" class="moderation-danger-button" data-report-action="delete-spot" data-report-id="${item.id}" data-spot-id="${escapeHtml(spot.id)}">Excluir spot</button>` : ''}
          ${targetUserId ? `<button type="button" class="moderation-secondary-button" data-report-action="timeout-user" data-report-id="${item.id}" data-user-id="${escapeHtml(targetUserId)}">Timeout user</button>` : ''}
          ${targetUserId ? `<button type="button" class="moderation-danger-button" data-report-action="ban-user" data-report-id="${item.id}" data-user-id="${escapeHtml(targetUserId)}">Banir user</button>` : ''}
          <button type="button" class="moderation-primary-button" data-report-action="resolve" data-report-id="${item.id}">Resolver</button>
          <button type="button" class="moderation-danger-button" data-report-action="reject" data-report-id="${item.id}">Rejeitar denúncia</button>
        </div>
      </article>
    `
  }).join('')
}

async function onReportClick(event) {
  const actionButton = event.target.closest('[data-report-action]')
  if (!actionButton) return

  const action = actionButton.dataset.reportAction
  const id = Number(actionButton.dataset.reportId)
  const note = ui.reportsList.querySelector(`[data-report-note="${id}"]`)?.value.trim() || ''
  const report = state.denuncias.find((item) => Number(item.id) === id)
  if (!report) return

  let result = null

  if (action === 'resolve' || action === 'reject') {
    const estado = action === 'resolve' ? 'resolvida' : 'rejeitada'
    const confirmed = await showConfirm({
      title: estado === 'resolvida' ? 'Resolver denúncia' : 'Rejeitar denúncia',
      message: 'Queres fechar esta denúncia?',
      confirmText: estado === 'resolvida' ? 'Resolver' : 'Rejeitar',
      danger: estado === 'rejeitada'
    })

    if (!confirmed) return
    result = await moderarDenuncia(id, estado, note)
  }

  if (action === 'delete-spot') {
    const spotId = Number(actionButton.dataset.spotId)
    const confirmed = await showConfirm({
      title: 'Excluir spot denunciado',
      message: 'O spot deixa de aparecer no mapa e a denúncia fica resolvida. Queres continuar?',
      confirmText: 'Excluir spot',
      danger: true
    })

    if (!confirmed) return
    result = await excluirSpotModeracao({ spotId, denunciaId: id, nota: note })
  }

  if (action === 'ban-user') {
    const confirmed = await showConfirm({
      title: 'Banir utilizador',
      message: 'O utilizador fica bloqueado e deixa de poder participar. Queres continuar?',
      confirmText: 'Banir user',
      danger: true
    })

    if (!confirmed) return
    result = await banirUsuarioModeracao({ userId: actionButton.dataset.userId, denunciaId: id, nota: note })
  }

  if (action === 'timeout-user') {
    const hours = Number(window.prompt('Timeout por quantas horas?', '24'))
    if (!Number.isFinite(hours) || hours <= 0) return

    const confirmed = await showConfirm({
      title: 'Aplicar timeout',
      message: `O utilizador fica impedido de participar durante ${hours} horas. Queres continuar?`,
      confirmText: 'Aplicar timeout',
      danger: true
    })

    if (!confirmed) return
    result = await aplicarTimeoutUsuarioModeracao({
      userId: actionButton.dataset.userId,
      timeoutUntil: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      denunciaId: id,
      nota: note
    })
  }

  if (!result) {
    showToast('Não foi possível executar a ação de moderação.', { type: 'error' })
    return
  }

  await Promise.all([carregarDenuncias(), carregarSolicitacoes()])
  showToast(getReportActionSuccessMessage(action), { type: 'success' })
}

function getReportTargetUserId(item) {
  if (item.entidade_tipo === 'user') return item.entidade_id
  if (item.entidade_tipo === 'spot') return item.entidade?.criador_id || null
  return null
}

function getReportTargetLabel(item) {
  if (item.entidade_tipo === 'spot' && item.entidade?.nome) return item.entidade.nome
  if (item.entidade_tipo === 'user' && item.entidade?.nome) return item.entidade.nome
  if (item.entidade_tipo === 'user' && item.entidade?.role) return `Utilizador ${item.entidade.role}`
  return `${item.entidade_tipo || 'entidade'} #${item.entidade_id || '-'}`
}

function getReportActionSuccessMessage(action) {
  if (action === 'delete-spot') return 'Spot excluído e denúncia resolvida.'
  if (action === 'ban-user') return 'Utilizador banido e denúncia resolvida.'
  if (action === 'timeout-user') return 'Timeout aplicado e denúncia resolvida.'
  if (action === 'reject') return 'Denúncia rejeitada.'
  return 'Denúncia atualizada.'
}

function buildXpSubmissionTitle(submissao) {
  if (submissao.tipo === 'combo') return `Combo #${submissao.combo_id || submissao.id}`
  if (submissao.manobra?.nome) return submissao.manobra.nome
  if (submissao.spot?.nome) return submissao.spot.nome
  return `Submissão #${submissao.id}`
}

function buildExcerpt(text = '', limit = 140) {
  if (!text) return 'Sem descrição detalhada.'
  return text.length > limit ? `${text.slice(0, limit - 3).trim()}...` : text
}

function formatDate(value) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleString('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function formatCoordinates(spot) {
  if (!spot) return 'Coordenadas por validar'
  const lat = Number(spot.coordenadas_lat)
  const lng = Number(spot.coordenadas_long)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Coordenadas por validar'
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

document.addEventListener('DOMContentLoaded', initModeraçãoPage)






