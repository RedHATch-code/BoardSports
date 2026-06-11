import { obterUsuarioAtual, fazerLogout } from './auth_utils.js'
import { supabase } from './supabase.js'

const ROOT_ID = 'site-floating-dock'
const ADMIN_EMAIL = 'tiagomendessss2022@gmail.com'

const PAGE_KEY_MAP = {
  'index.html': 'home',
  'admin-login.html': 'admin-login',
  'login.html': 'login',
  'register.html': 'register',
  'mapa.html': 'map',
  'videos.html': 'videos',
  'leaderboard.html': 'leaderboard',
  'pesquisa.html': 'search',
  'perfil.html': 'profile',
  'configuracao.html': 'profile',
  'notificacoes.html': 'notifications',
  'moderacao.html': 'moderation',
  'apresentacao.html': 'presentation',
  'sobre.html': 'about',
  'contacto.html': 'contact',
  'termos.html': 'terms',
  'privacidade.html': 'privacy'
}

function getCurrentPageKey() {
  const path = window.location.pathname.split('/').pop() || 'index.html'
  return PAGE_KEY_MAP[path] || 'home'
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getInitials(label = '') {
  const cleaned = label.trim()
  if (!cleaned) return 'BS'

  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BS'
}

function primaryItems() {
  return [
    { key: 'map', title: 'Spots', href: '/mapa.html' },
    { key: 'videos', title: 'Sessões', href: '/videos.html' },
    { key: 'leaderboard', title: 'XP', href: '/leaderboard.html' },
    { key: 'search', title: 'Pesquisa', href: '/pesquisa.html' }
  ]
}

function menuGroups(user) {
  const explore = [
    { key: 'home', title: 'Início', href: '/index.html', description: 'Voltar a página principal.' },
    { key: 'map', title: 'Mapa de spots', href: '/mapa.html', description: 'Ver spots públicos e submeter novos locais.' },
    { key: 'videos', title: 'Vídeos recentes', href: '/videos.html', description: 'Clips e atividade da comunidade.' },
    { key: 'leaderboard', title: 'Ranking XP', href: '/leaderboard.html', description: 'Níveis, XP e progresso dos riders.' }
  ]

  const account = user
    ? [
        { key: 'profile', title: 'Perfil', href: '/perfil.html', description: 'Gerir perfil, publicações e mensagens.' },
        { key: 'notifications', title: 'Notificações', href: '/notificacoes.html', description: 'Aprovações, rejeições, XP e atividade.' },
        { key: 'settings', title: 'Configuração', href: '/configuracao.html', description: 'Editar dados, avatar e preferências.' },
        { key: 'logout', title: 'Terminar sessão', action: 'logout', description: 'Sair da conta atual.' }
      ]
    : [
        { key: 'login', title: 'Entrar', href: '/login.html', description: 'Aceder a tua conta.' },
        { key: 'register', title: 'Criar conta', href: '/register.html', description: 'Entrar na comunidade BoardSports.' }
      ]

  if (user?.email?.toLowerCase() === ADMIN_EMAIL && user?.perfil?.is_admin) {
    account.splice(1, 0, {
      key: 'moderation',
      title: 'Moderação',
      href: '/moderacao.html',
      description: 'Validar spots, vídeos e submissões XP.'
    })
  }

  const institutional = [
    { key: 'presentation', title: 'Apresentação', href: '/apresentacao.html', description: 'Resumo da PAP e funcionalidades do projeto.' },
    { key: 'about', title: 'Sobre', href: '/sobre.html', description: 'Missão e funcionamento da comunidade.' },
    { key: 'contact', title: 'Contacto', href: '/contacto.html', description: 'Falar com a equipa BoardSports.' },
    { key: 'terms', title: 'Termos', href: '/termos.html', description: 'Regras de uso da plataforma.' },
    { key: 'privacy', title: 'Privacidade', href: '/privacidade.html', description: 'Como tratamos dados e segurança.' }
  ]

  return [
    { key: 'account', title: 'Conta', items: account },
    { key: 'explore', title: 'Explorar', items: explore },
    { key: 'info', title: 'Info', items: institutional }
  ]
}

function renderLink(item, currentKey, className = 'site-dock__link') {
  const activeClass = item.key === currentKey ? ' is-active' : ''

  if (item.action) {
    return `
      <button type="button" class="${className}${activeClass}" data-action="${item.action}">
        <span>${escapeHtml(item.title)}</span>
        ${item.description ? `<em>${escapeHtml(item.description)}</em>` : ''}
      </button>
    `
  }

  return `
    <a class="${className}${activeClass}" href="${item.href}" ${item.key === currentKey ? 'aria-current="page"' : ''}>
      <span>${escapeHtml(item.title)}</span>
      ${item.description ? `<em>${escapeHtml(item.description)}</em>` : ''}
    </a>
  `
}

function renderAvatar(user) {
  if (!user) {
    return '<span class="site-dock__avatar site-dock__avatar--guest">BS</span>'
  }

  const photoUrl = user?.perfil?.foto_perfil ? escapeHtml(user.perfil.foto_perfil) : ''
  const initials = escapeHtml(getInitials(user?.perfil?.nome || user.email || 'BS'))

  if (photoUrl) {
    return `
      <span class="site-dock__avatar">
        <img src="${photoUrl}" alt="Foto de perfil" width="34" height="34" loading="lazy" decoding="async">
      </span>
    `
  }

  return `<span class="site-dock__avatar">${initials}</span>`
}

function renderAccountLink(user, currentKey) {
  if (user) {
    return `
      <a class="site-dock__account${currentKey === 'profile' ? ' is-active' : ''}" href="/perfil.html" aria-label="Abrir perfil">
        ${renderAvatar(user)}
        <span>Perfil</span>
      </a>
    `
  }

  return '<a class="site-dock__account" href="/login.html"><span>Entrar</span></a>'
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID)
  if (!root) {
    root = document.createElement('header')
    root.id = ROOT_ID
    root.className = 'site-dock'
    document.body.insertBefore(root, document.body.firstChild)
  }
  return root
}

function syncLayoutMode() {
  const isAuthLayout = Boolean(document.querySelector('.auth-container'))
  document.body.classList.toggle('site-dock-auth', isAuthLayout)
}

function bindActions(root) {
  const buttons = [...root.querySelectorAll('[data-action="logout"]')]
  const onClick = async () => {
    await fazerLogout()
  }

  buttons.forEach((button) => button.addEventListener('click', onClick))

  return () => {
    buttons.forEach((button) => button.removeEventListener('click', onClick))
  }
}

function bindMenu(root) {
  const toggle = root.querySelector('[data-site-menu-toggle]')
  const panel = root.querySelector('[data-site-menu-panel]')
  if (!toggle || !panel) return () => {}

  const closeMenu = () => {
    root.classList.remove('is-menu-open')
    toggle.setAttribute('aria-expanded', 'false')
  }

  const openMenu = () => {
    root.classList.add('is-menu-open')
    toggle.setAttribute('aria-expanded', 'true')
  }

  const onToggleClick = () => {
    if (root.classList.contains('is-menu-open')) {
      closeMenu()
    } else {
      openMenu()
    }
  }

  const onDocumentPointerDown = (event) => {
    if (!root.contains(event.target)) closeMenu()
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') closeMenu()
  }

  const onPanelClick = (event) => {
    if (event.target.closest('a, button')) closeMenu()
  }

  toggle.addEventListener('click', onToggleClick)
  panel.addEventListener('click', onPanelClick)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onKeyDown)

  return () => {
    toggle.removeEventListener('click', onToggleClick)
    panel.removeEventListener('click', onPanelClick)
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    document.removeEventListener('keydown', onKeyDown)
  }
}

function bindInteractions(root) {
  const cleanups = [
    bindActions(root),
    bindMenu(root)
  ]

  return () => cleanups.forEach((cleanup) => cleanup?.())
}

async function renderHeader() {
  const root = ensureRoot()
  if (typeof root._cleanupDock === 'function') {
    root._cleanupDock()
  }

  const currentKey = getCurrentPageKey()
  const user = await obterUsuarioAtual()
  const groups = menuGroups(user)

  root.innerHTML = `
    <div class="site-dock__shell">
      <a class="site-dock__brand-link" href="/index.html" aria-label="BoardSports">
        <span class="site-dock__brand-mark">
          <img src="/assets/images/Logo_pap.png" alt="" width="46" height="46" loading="eager">
        </span>
        <span class="site-dock__brand-copy">
          <span class="site-dock__brand-title">BoardSports</span>
        </span>
      </a>

      <nav class="site-dock__nav" aria-label="Navegação principal">
        ${primaryItems().map((item) => renderLink(item, currentKey)).join('')}
      </nav>

      <div class="site-dock__actions">
        ${renderAccountLink(user, currentKey)}
        <button class="site-dock__menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu-panel" data-site-menu-toggle>
          <span>Menu</span>
        </button>
      </div>
    </div>

    <div class="site-dock__panel" id="site-menu-panel" data-site-menu-panel>
      <div class="site-dock__panel-head">
        <span>000</span>
        <strong>BoardSports</strong>
      </div>
      <div class="site-dock__panel-grid">
        ${groups.map((group) => `
          <section class="site-dock__panel-section site-dock__panel-section--${escapeHtml(group.key || 'default')}">
            <h2>${escapeHtml(group.title)}</h2>
            <div class="site-dock__panel-links">
              ${group.items.map((item) => renderLink(item, currentKey, 'site-dock__panel-link')).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    </div>
  `

  syncLayoutMode()
  root._cleanupDock = bindInteractions(root)
}

function setupListeners() {
  window.addEventListener('boardsports:header-sync', () => {
    renderHeader().catch((error) => {
      console.error('Erro ao atualizar a navegação:', error)
    })
  })

  supabase.auth.onAuthStateChange(() => {
    renderHeader().catch((error) => {
      console.error('Erro ao sincronizar sessão na navegação:', error)
    })
  })
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader().catch((error) => {
    console.error('Erro ao renderizar a navegação:', error)
  })
  setupListeners()
})






