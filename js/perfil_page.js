import {
  inicializarPaginaProtegida,
  obterUsuarioAtual
} from './auth_utils.js'
import {
  enviarMensagem,
  obterMensagensUsuario,
  obterPerfil,
  obterPerfilPorEmail,
  obterPublicacoesPerfil,
  obterResumoXp,
  obterSeguidoresPerfil
} from './db_utils.js'
import { showToast } from './ui_feedback.js'

const state = {
  usuario: null,
  perfil: null,
  seguidores: [],
  publicacoes: [],
  mensagens: []
}

const ui = {
  displayName: null,
  displayBio: null,
  xpLevel: null,
  xpName: null,
  xpProgress: null,
  xpMeta: null,
  adminLinkWrapper: null,
  avatarImage: null,
  avatarFallback: null,
  publicationsCount: null,
  followersCount: null,
  publicationsMeta: null,
  followersMeta: null,
  messagesMeta: null,
  publicationsList: null,
  followersList: null,
  messagesList: null,
  messageForm: null,
  messageRecipient: null,
  messageContent: null,
  messageFeedback: null
}

async function inicializarPerfil() {
  const autenticado = await inicializarPaginaProtegida()
  if (!autenticado) return

  cacheDom()
  bindEvents()
  await carregarPerfil()
}

function cacheDom() {
  ui.displayName = document.getElementById('profile-display-name')
  ui.displayBio = document.getElementById('profile-display-bio')
  ui.xpLevel = document.getElementById('profile-xp-level')
  ui.xpName = document.getElementById('profile-xp-name')
  ui.xpProgress = document.getElementById('profile-xp-progress')
  ui.xpMeta = document.getElementById('profile-xp-meta')
  ui.adminLinkWrapper = document.getElementById('profile-admin-link-wrapper')
  ui.avatarImage = document.getElementById('avatar-image')
  ui.avatarFallback = document.getElementById('avatar-fallback')
  ui.publicationsCount = document.getElementById('publications-count')
  ui.followersCount = document.getElementById('followers-count')
  ui.publicationsMeta = document.getElementById('publications-meta')
  ui.followersMeta = document.getElementById('followers-meta')
  ui.messagesMeta = document.getElementById('messages-meta')
  ui.publicationsList = document.getElementById('publications-list')
  ui.followersList = document.getElementById('followers-list')
  ui.messagesList = document.getElementById('messages-list')
  ui.messageForm = document.getElementById('message-form')
  ui.messageRecipient = document.getElementById('message-recipient')
  ui.messageContent = document.getElementById('message-content')
  ui.messageFeedback = document.getElementById('message-feedback')
}

function bindEvents() {
  ui.messageForm.addEventListener('submit', onMessageSubmit)
}

async function carregarPerfil() {
  try {
    state.usuario = await obterUsuarioAtual()
    if (!state.usuario) return

    state.perfil = await obterPerfil(state.usuario.id)
    if (!state.perfil) return

    const [seguidores, publicacoes, mensagens] = await Promise.all([
      obterSeguidoresPerfil(state.usuario.id),
      obterPublicacoesPerfil(state.usuario.id, state.perfil.role),
      obterMensagensUsuario(state.usuario.id)
    ])

    state.seguidores = seguidores
    state.publicacoes = publicacoes
    state.mensagens = mensagens

    renderHero()
    renderAvatar()
    renderPublicacoes()
    renderSeguidores()
    renderMensagens()
  } catch (error) {
    console.error('Erro ao carregar a overview do perfil:', error)
    showMessageFeedback('Erro ao carregar o perfil.', 'error')
  }
}

function renderHero() {
  const displayName = state.perfil?.nome || state.usuario?.email || 'Perfil'
  const bio = state.perfil?.bio?.trim() || 'Adiciona uma bio na configuracao para personalizar esta area.'

  ui.displayName.textContent = displayName
  ui.displayBio.textContent = bio
  ui.adminLinkWrapper.hidden = !state.perfil?.is_admin
  ui.publicationsCount.textContent = String(state.publicacoes.length)
  ui.followersCount.textContent = String(state.seguidores.length)
  renderXpSummary()
}

function renderXpSummary() {
  const xp = obterResumoXp(state.perfil)

  ui.xpLevel.textContent = `Nivel ${xp.nivel_xp}`
  ui.xpName.textContent = xp.nivel_nome
  ui.xpProgress.style.width = `${xp.progresso_percentagem}%`
  ui.xpMeta.textContent = xp.proximo_nivel
    ? `${xp.xp_total} XP total · faltam ${xp.xp_para_proximo} XP para ${xp.proximo_nivel.name}`
    : `${xp.xp_total} XP total · nivel maximo`
}

function renderAvatar() {
  const photoUrl = state.perfil?.foto_perfil || ''
  const initials = getInitials(state.perfil?.nome || state.usuario?.email || 'BS')

  ui.avatarFallback.textContent = initials
  ui.avatarFallback.style.display = photoUrl ? 'none' : 'inline-flex'

  if (!photoUrl) {
    ui.avatarImage.removeAttribute('src')
    ui.avatarImage.classList.remove('is-visible')
    return
  }

  ui.avatarImage.src = photoUrl
  ui.avatarImage.classList.add('is-visible')
  ui.avatarImage.onerror = () => {
    ui.avatarImage.removeAttribute('src')
    ui.avatarImage.classList.remove('is-visible')
    ui.avatarFallback.style.display = 'inline-flex'
  }
}

function renderPublicacoes() {
  const countLabel = `${state.publicacoes.length} ${state.publicacoes.length === 1 ? 'item' : 'itens'}`
  ui.publicationsMeta.textContent = countLabel

  if (!state.publicacoes.length) {
    ui.publicationsList.innerHTML = '<article class="profile-empty-card"><p>Ainda nao tens publicacoes visiveis.</p></article>'
    return
  }

  ui.publicationsList.innerHTML = state.publicacoes.map((publicacao) => `
    <article class="profile-publication-card">
      <div class="profile-publication-top">
        <span class="profile-publication-tag">${escapeHtml(publicacao.tipo)}</span>
        <small>${escapeHtml(formatDate(publicacao.data))}</small>
      </div>
      <h3>${escapeHtml(publicacao.titulo)}</h3>
      <p>${escapeHtml(publicacao.descricao || 'Sem descricao adicional.')}</p>
      <div class="profile-publication-footer">
        <span>${escapeHtml(publicacao.destaque || 'BoardSports')}</span>
        <a href="${escapeHtml(publicacao.url || 'perfil.html')}" class="profile-action-button">Abrir</a>
      </div>
    </article>
  `).join('')
}

function renderSeguidores() {
  const countLabel = `${state.seguidores.length} ${state.seguidores.length === 1 ? 'seguidor' : 'seguidores'}`
  ui.followersMeta.textContent = countLabel

  if (!state.seguidores.length) {
    ui.followersList.innerHTML = '<article class="profile-empty-card"><p>Ainda nao tens seguidores visiveis.</p></article>'
    return
  }

  ui.followersList.innerHTML = state.seguidores.map((item) => {
    const follower = item.perfil || {}
    const name = follower.nome || follower.email || 'Utilizador'
    const subtitle = truncateText(follower.bio, 60)

    return `
      <article class="profile-follower-card">
        ${renderMiniAvatar(follower)}
        <div class="profile-follower-copy">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(subtitle || 'Seguidor BoardSports')}</span>
        </div>
      </article>
    `
  }).join('')
}

function renderMensagens() {
  const countLabel = `${state.mensagens.length} ${state.mensagens.length === 1 ? 'mensagem' : 'mensagens'}`
  ui.messagesMeta.textContent = countLabel

  if (!state.mensagens.length) {
    ui.messagesList.innerHTML = '<article class="profile-empty-card"><p>Ainda nao tens mensagens.</p></article>'
    return
  }

  ui.messagesList.innerHTML = state.mensagens.map((mensagem) => {
    const enviadaPorMim = mensagem.remetente_id === state.usuario.id
    const interlocutor = enviadaPorMim ? mensagem.destinatario : mensagem.remetente
    const label = interlocutor?.nome || interlocutor?.email || 'Utilizador'
    const direction = enviadaPorMim ? 'Enviada' : 'Recebida'

    return `
      <article class="profile-message-card ${enviadaPorMim ? 'is-sent' : 'is-received'}">
        <div class="profile-message-head">
          <strong>${escapeHtml(direction)} · ${escapeHtml(label)}</strong>
          <small>${escapeHtml(formatDate(mensagem.data_envio))}</small>
        </div>
        <p>${escapeHtml(mensagem.conteudo)}</p>
      </article>
    `
  }).join('')
}

async function onMessageSubmit(event) {
  event.preventDefault()

  if (!state.usuario) {
    showMessageFeedback('Sessao invalida. Faz login novamente.', 'error')
    return
  }

  const recipientEmail = ui.messageRecipient.value.trim().toLowerCase()
  const content = ui.messageContent.value.trim()

  if (!recipientEmail || !content) {
    showMessageFeedback('Preenche o email do destinatario e a mensagem.', 'error')
    return
  }

  if (recipientEmail === String(state.usuario.email || '').trim().toLowerCase()) {
    showMessageFeedback('Nao podes enviar mensagem para a tua propria conta.', 'error')
    return
  }

  const recipient = await obterPerfilPorEmail(recipientEmail, state.usuario.id)
  if (!recipient) {
    showMessageFeedback('Nao foi encontrado nenhum utilizador com esse email.', 'error')
    return
  }

  const enviada = await enviarMensagem(state.usuario.id, recipient.id, content)
  if (!enviada) {
    showMessageFeedback('Nao foi possivel enviar a mensagem. Verifica se a politica de mensagens ja foi aplicada no Supabase.', 'error')
    return
  }

  ui.messageForm.reset()
  state.mensagens = await obterMensagensUsuario(state.usuario.id)
  renderMensagens()
  showMessageFeedback('Mensagem enviada com sucesso.', 'success')
  showToast('Mensagem enviada.', { type: 'success' })
}

function showMessageFeedback(text, type) {
  ui.messageFeedback.hidden = false
  ui.messageFeedback.textContent = text
  ui.messageFeedback.style.color = type === 'error' ? '#fecaca' : '#d1fae5'
  ui.messageFeedback.style.border = `1px solid ${type === 'error' ? 'rgba(248, 113, 113, 0.35)' : 'rgba(52, 211, 153, 0.3)'}`
  ui.messageFeedback.style.background = type === 'error' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(5, 150, 105, 0.18)'

  clearTimeout(showMessageFeedback.timeoutId)
  showMessageFeedback.timeoutId = setTimeout(() => {
    ui.messageFeedback.hidden = true
  }, 3600)
}

function renderMiniAvatar(perfil) {
  const photoUrl = perfil?.foto_perfil ? escapeHtml(perfil.foto_perfil) : ''
  const initials = escapeHtml(getInitials(perfil?.nome || perfil?.email || 'BS'))

  if (photoUrl) {
    return `
      <span class="profile-mini-avatar">
        <img src="${photoUrl}" alt="Avatar de ${escapeHtml(perfil?.nome || 'utilizador')}" width="42" height="42" loading="lazy" decoding="async" onerror="this.remove(); this.parentElement.classList.add('is-fallback');">
        <span class="profile-mini-avatar-fallback">${initials}</span>
      </span>
    `
  }

  return `
    <span class="profile-mini-avatar is-fallback">
      <span class="profile-mini-avatar-fallback">${initials}</span>
    </span>
  `
}

function getInitials(label = '') {
  const cleaned = String(label || '').trim()
  if (!cleaned) return 'BS'

  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BS'
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Date(value).toLocaleString('pt-PT', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function truncateText(value, limit = 80) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

document.addEventListener('DOMContentLoaded', inicializarPerfil)
