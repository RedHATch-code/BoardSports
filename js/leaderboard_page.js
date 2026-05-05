import {
  XP_LEVELS,
  obterLeaderboardXp,
  obterModalidades,
  obterResumoXp
} from './db_utils.js'

const state = {
  filtro: 'global',
  modalidadeId: '',
  modalidades: [],
  riders: []
}

const ui = {
  topXp: null,
  topName: null,
  filter: null,
  modalidade: null,
  refresh: null,
  list: null,
  levelsGrid: null
}

function cacheDom() {
  ui.topXp = document.getElementById('leaderboard-top-xp')
  ui.topName = document.getElementById('leaderboard-top-name')
  ui.filter = document.getElementById('leaderboard-filter')
  ui.modalidade = document.getElementById('leaderboard-modalidade')
  ui.refresh = document.getElementById('leaderboard-refresh')
  ui.list = document.getElementById('leaderboard-list')
  ui.levelsGrid = document.getElementById('xp-levels-grid')
}

function bindEvents() {
  ui.filter.addEventListener('change', async (event) => {
    state.filtro = event.target.value
    ui.modalidade.hidden = state.filtro !== 'desporto'
    await carregarLeaderboard()
  })

  ui.modalidade.addEventListener('change', async (event) => {
    state.modalidadeId = event.target.value
    await carregarLeaderboard()
  })

  ui.refresh.addEventListener('click', carregarLeaderboard)
}

async function initLeaderboard() {
  cacheDom()
  bindEvents()
  renderLevels()
  await carregarModalidades()
  await carregarLeaderboard()
}

async function carregarModalidades() {
  state.modalidades = await obterModalidades()
  ui.modalidade.innerHTML = [
    '<option value="">Selecionar modalidade</option>',
    ...state.modalidades.map((modalidade) => `<option value="${modalidade.id}">${escapeHtml(modalidade.nome)}</option>`)
  ].join('')
}

async function carregarLeaderboard() {
  ui.list.innerHTML = '<article class="xp-empty-card"><p>A carregar leaderboard...</p></article>'
  state.riders = await obterLeaderboardXp(state.filtro, state.modalidadeId)
  renderLeaderboard()
}

function renderLeaderboard() {
  const riders = state.riders || []
  const top = riders[0]

  ui.topXp.textContent = `${Number(top?.xp_ranking ?? top?.xp_total ?? 0)} XP`
  ui.topName.textContent = top ? (top.nome || top.email || 'Rider BoardSports') : 'Sem dados XP ainda.'

  if (!riders.length) {
    ui.list.innerHTML = `
      <article class="xp-empty-card">
        <p>Ainda nao ha XP registado. Aplica o SQL do BoardSports XP System e valida submissões para popular o ranking.</p>
      </article>
    `
    return
  }

  ui.list.innerHTML = riders.map((rider, index) => {
    const summary = obterResumoXp(rider)
    const rank = index + 1
    const medal = rank === 1 ? 'Ouro' : rank === 2 ? 'Prata' : rank === 3 ? 'Bronze' : `#${rank}`
    const rankingXp = Number(rider.xp_ranking ?? rider.periodo_xp ?? rider.xp_total ?? 0)

    return `
      <article class="leaderboard-card ${rank <= 3 ? 'is-podium' : ''}">
        <div class="leaderboard-rank">${escapeHtml(medal)}</div>
        <div class="leaderboard-rider">
          ${renderAvatar(rider)}
          <div>
            <h3>${escapeHtml(rider.nome || rider.email || 'Rider BoardSports')}</h3>
            <p>${escapeHtml(summary.nivel_nome)} · ${escapeHtml(summary.tipo_user)}</p>
          </div>
        </div>
        <div class="leaderboard-score">
          <strong>${rankingXp} XP</strong>
          <span>Nivel ${summary.nivel_xp}</span>
        </div>
      </article>
    `
  }).join('')
}

function renderLevels() {
  ui.levelsGrid.innerHTML = XP_LEVELS.map((level) => `
    <article class="xp-level-card">
      <span>${escapeHtml(level.tipo_user)}</span>
      <strong>Nivel ${level.level}</strong>
      <h3>${escapeHtml(level.name)}</h3>
      <p>${level.xp} XP</p>
    </article>
  `).join('')
}

function renderAvatar(rider) {
  const photoUrl = rider?.foto_perfil || ''
  const label = rider?.nome || rider?.email || 'BS'
  const initials = escapeHtml(getInitials(label))

  if (photoUrl) {
    return `
      <span class="leaderboard-avatar">
        <img src="${escapeHtml(photoUrl)}" alt="Foto de ${escapeHtml(label)}" onerror="this.remove(); this.parentElement.classList.add('is-fallback');">
        <span>${initials}</span>
      </span>
    `
  }

  return `<span class="leaderboard-avatar is-fallback"><span>${initials}</span></span>`
}

function getInitials(label = '') {
  return String(label || 'BS')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BS'
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

document.addEventListener('DOMContentLoaded', initLeaderboard)
