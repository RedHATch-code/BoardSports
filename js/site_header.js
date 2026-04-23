import { obterUsuarioAtual, fazerLogout } from './auth_utils.js'
import { supabase } from './supabase.js'

const ROOT_ID = 'site-floating-dock'
const SPACER_ID = 'site-floating-dock-spacer'
const DESKTOP_RANGE = 150
const BASE_ITEM_SIZE = 48
const MAX_ITEM_SIZE = 78
const BASE_ICON_SIZE = 20
const MAX_ICON_SIZE = 34
const MAX_ITEM_SHIFT = 14

const PAGE_KEY_MAP = {
  'index.html': 'home',
  'login.html': 'login',
  'register.html': 'register',
  'dashboard.html': 'home',
  'produtos.html': 'products',
  'modalidades.html': 'modalities',
  'mapa.html': 'map',
  'perfil.html': 'profile',
  'empresa.html': 'company',
  'moderacao.html': 'moderation'
}

function getCurrentPageKey() {
  const path = window.location.pathname.split('/').pop() || 'index.html'
  return PAGE_KEY_MAP[path] || ''
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

function iconSvg(name) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"'
  const icons = {
    home: `<svg class="site-dock__icon" ${common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V20h14V9.8"/><path d="M9.5 20v-5.5h5V20"/></svg>`,
    products: `<svg class="site-dock__icon" ${common}><path d="M6 7h12"/><path d="M8 4h8"/><path d="M5 7l1 12h12l1-12"/><path d="M10 11v4"/><path d="M14 11v4"/></svg>`,
    modalities: `<svg class="site-dock__icon" ${common}><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>`,
    map: `<svg class="site-dock__icon" ${common}><path d="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2z"/><path d="M9 4v14"/><path d="M15 6v14"/></svg>`,
    company: `<svg class="site-dock__icon" ${common}><path d="M4 20h16"/><path d="M6 20V8l6-4 6 4v12"/><path d="M9 11h.01"/><path d="M15 11h.01"/><path d="M9 15h.01"/><path d="M15 15h.01"/><path d="M11 20v-4h2v4"/></svg>`,
    moderation: `<svg class="site-dock__icon" ${common}><path d="m12 3 7 4v5c0 4.5-2.7 7.9-7 9-4.3-1.1-7-4.5-7-9V7l7-4Z"/><path d="m9.5 12 1.8 1.8 3.7-3.8"/></svg>`,
    profile: `<svg class="site-dock__icon" ${common}><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>`,
    login: `<svg class="site-dock__icon" ${common}><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/><path d="M20 4v16"/></svg>`,
    register: `<svg class="site-dock__icon" ${common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    logout: `<svg class="site-dock__icon" ${common}><path d="M14 7l5 5-5 5"/><path d="M19 12H8"/><path d="M4 4v16"/></svg>`,
    menu: `<svg class="site-dock__icon" ${common}><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`,
    close: `<svg class="site-dock__icon" ${common}><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>`
  }

  return icons[name] || icons.home
}

function buildDockItems(user) {
  const loginHref = '/login.html'
  const homeHref = user ? '/dashboard.html' : '/index.html'
  const items = [
    { key: 'home', title: 'Inicio', href: homeHref, icon: 'home' },
    { key: 'products', title: 'Produtos', href: '/produtos.html', icon: 'products' },
    { key: 'modalities', title: 'Modalidades', href: '/modalidades.html', icon: 'modalities' },
    { key: 'map', title: 'Mapa', href: '/mapa.html', icon: 'map' }
  ]

  if (user?.perfil?.role === 'empresa') {
    items.push({ key: 'company', title: 'Empresa', href: '/empresa.html', icon: 'company' })
  }

  if (user?.perfil?.is_admin) {
    items.push({ key: 'moderation', title: 'Moderacao', href: '/moderacao.html', icon: 'moderation' })
  }

  if (user) {
    items.push({ key: 'profile', title: 'Perfil', href: '/perfil.html', icon: 'profile' })
    items.push({ key: 'logout', title: 'Logout', action: 'logout', icon: 'logout' })
    return items
  }

  items.push({ key: 'login', title: 'Entrar', href: loginHref, icon: 'login' })
  items.push({ key: 'register', title: 'Registar', href: '/register.html', icon: 'register' })
  return items
}

function renderDockItem(item, currentKey, extraClass = '') {
  const activeClass = item.key === currentKey ? ' is-active' : ''
  const sharedAttributes = `
    class="site-dock__item ${item.action ? 'site-dock__action' : 'site-dock__link'}${activeClass}${extraClass ? ` ${extraClass}` : ''}"
    data-title="${item.title}"
    data-dock-item
    aria-label="${item.title}"
  `

  if (item.action) {
    return `
      <button type="button" ${sharedAttributes} data-action="${item.action}">
        ${iconSvg(item.icon)}
      </button>
    `
  }

  return `
    <a ${sharedAttributes} href="${item.href}" ${item.key === currentKey ? 'aria-current="page"' : ''}>
      ${iconSvg(item.icon)}
    </a>
  `
}

function renderDockItems(items, currentKey, extraClass = '') {
  return items.map((item) => renderDockItem(item, currentKey, extraClass)).join('')
}

function renderAvatar(user) {
  if (!user) {
    return `
      <span class="site-dock__avatar">
        <span class="site-dock__avatar-fallback">BS</span>
      </span>
    `
  }

  const initials = escapeHtml(getInitials(user?.perfil?.nome || user.email || 'BS'))
  const photoUrl = user?.perfil?.foto_perfil ? escapeHtml(user.perfil.foto_perfil) : ''

  if (photoUrl) {
    return `
      <span class="site-dock__avatar">
        <img
          class="site-dock__avatar-image"
          src="${photoUrl}"
          alt="Foto de perfil"
          onerror="this.remove(); this.parentElement.classList.add('is-fallback');"
        >
        <span class="site-dock__avatar-fallback">${initials}</span>
      </span>
    `
  }

  return `
    <span class="site-dock__avatar is-fallback">
      <span class="site-dock__avatar-fallback">${initials}</span>
    </span>
  `
}

function renderUserBlock(user) {
  if (!user) {
    return `
      <div class="site-dock__user" aria-label="Sessao">
        ${renderAvatar(null)}
        <span class="site-dock__user-copy">
          <span class="site-dock__user-name">Visitante</span>
          <span class="site-dock__user-role">Modo visitante</span>
        </span>
      </div>
    `
  }

  const displayName = escapeHtml(user?.perfil?.nome || user.email || 'Utilizador')
  const role = escapeHtml(user?.perfil?.role || 'membro')

  return `
    <div class="site-dock__user" aria-label="Utilizador">
      ${renderAvatar(user)}
      <span class="site-dock__user-copy">
        <span class="site-dock__user-name">${displayName}</span>
        <span class="site-dock__user-role">${role}</span>
      </span>
    </div>
  `
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

function syncSpacer() {
  const isAuthLayout = Boolean(document.querySelector('.auth-container'))
  document.body.classList.toggle('site-dock-auth', isAuthLayout)

  let spacer = document.getElementById(SPACER_ID)
  if (isAuthLayout) {
    if (spacer) spacer.remove()
    return
  }

  if (!spacer) {
    spacer = document.createElement('div')
    spacer.id = SPACER_ID
    spacer.className = 'site-dock-spacer'
    const root = document.getElementById(ROOT_ID)
    document.body.insertBefore(spacer, root.nextSibling)
  }
}

function setDockItemState(item, ratio = 0, orientation = 'vertical') {
  const eased = Math.sin((Math.max(0, Math.min(1, ratio)) * Math.PI) / 2)
  const size = BASE_ITEM_SIZE + (MAX_ITEM_SIZE - BASE_ITEM_SIZE) * eased
  const iconSize = BASE_ICON_SIZE + (MAX_ICON_SIZE - BASE_ICON_SIZE) * eased
  const shiftX = orientation === 'vertical' ? MAX_ITEM_SHIFT * eased : 0
  const shiftY = orientation === 'horizontal' ? -MAX_ITEM_SHIFT * eased : 0

  item.style.setProperty('--dock-item-size', `${size}px`)
  item.style.setProperty('--dock-icon-size', `${iconSize}px`)
  item.style.setProperty('--dock-item-shift-x', `${shiftX}px`)
  item.style.setProperty('--dock-item-shift-y', `${shiftY}px`)
}

function bindDesktopDock(root) {
  const container = root.querySelector('[data-dock-desktop]')
  if (!container) return () => {}

  const items = [...container.querySelectorAll('[data-dock-item]')]
  const reset = () => items.forEach((item) => setDockItemState(item, 0, 'vertical'))

  const onPointerMove = (event) => {
    items.forEach((item) => {
      const rect = item.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const distance = Math.abs(event.clientY - center)
      const ratio = Math.max(0, 1 - distance / DESKTOP_RANGE)
      setDockItemState(item, ratio, 'vertical')
    })
  }

  const onPointerLeave = () => reset()
  const onFocusIn = (event) => {
    const focusedItem = event.target.closest('[data-dock-item]')
    if (!focusedItem) return

    items.forEach((item) => setDockItemState(item, item === focusedItem ? 0.72 : 0, 'vertical'))
  }

  const onFocusOut = () => {
    if (!container.contains(document.activeElement)) {
      reset()
    }
  }

  reset()
  container.addEventListener('pointermove', onPointerMove)
  container.addEventListener('pointerleave', onPointerLeave)
  container.addEventListener('focusin', onFocusIn)
  container.addEventListener('focusout', onFocusOut)

  return () => {
    container.removeEventListener('pointermove', onPointerMove)
    container.removeEventListener('pointerleave', onPointerLeave)
    container.removeEventListener('focusin', onFocusIn)
    container.removeEventListener('focusout', onFocusOut)
  }
}

function bindActions(root) {
  const buttons = [...root.querySelectorAll('[data-action="logout"]')]
  const onClick = async () => {
    await fazerLogout()
  }

  buttons.forEach((button) => button.addEventListener('click', onClick))
  return () => buttons.forEach((button) => button.removeEventListener('click', onClick))
}

function bindMobileDock(root) {
  const mobileDock = root.querySelector('[data-dock-mobile]')
  const toggle = root.querySelector('[data-dock-mobile-toggle]')
  if (!mobileDock || !toggle) return () => {}

  const closeMenu = () => {
    mobileDock.classList.remove('is-open')
    toggle.setAttribute('aria-expanded', 'false')
    toggle.innerHTML = iconSvg('menu')
  }

  const openMenu = () => {
    mobileDock.classList.add('is-open')
    toggle.setAttribute('aria-expanded', 'true')
    toggle.innerHTML = iconSvg('close')
  }

  const onToggleClick = () => {
    if (mobileDock.classList.contains('is-open')) {
      closeMenu()
      return
    }

    openMenu()
  }

  const onDocumentPointerDown = (event) => {
    if (!root.contains(event.target)) {
      closeMenu()
    }
  }

  const onItemClick = () => closeMenu()
  const mobileItems = [...mobileDock.querySelectorAll('.site-dock__mobile-panel [data-dock-item]')]

  toggle.addEventListener('click', onToggleClick)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  mobileItems.forEach((item) => item.addEventListener('click', onItemClick))

  return () => {
    toggle.removeEventListener('click', onToggleClick)
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    mobileItems.forEach((item) => item.removeEventListener('click', onItemClick))
  }
}

function bindInteractions(root) {
  const cleanups = [
    bindDesktopDock(root),
    bindActions(root),
    bindMobileDock(root)
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
  const items = buildDockItems(user)

  root.innerHTML = `
    <div class="site-dock__shell">
      <div class="site-dock__brand">
        <a class="site-dock__brand-link" href="${user ? '/dashboard.html' : '/index.html'}" aria-label="BoardSports">
          <span class="site-dock__brand-mark">BS</span>
          <span class="site-dock__brand-copy">
            <span class="site-dock__brand-title">BoardSports</span>
            <span class="site-dock__brand-subtitle">Spots / gear / crew</span>
          </span>
        </a>
      </div>

      <div class="site-dock__center">
        <nav class="site-dock__nav site-dock__nav--desktop" aria-label="Navegacao principal">
          <div class="site-dock__items" data-dock-desktop>
            ${renderDockItems(items, currentKey)}
          </div>
        </nav>

        <div class="site-dock__mobile" data-dock-mobile>
          <div class="site-dock__mobile-panel">
            ${renderDockItems(items, currentKey, 'site-dock__item--mobile')}
          </div>
          <button
            type="button"
            class="site-dock__mobile-toggle"
            data-dock-mobile-toggle
            aria-label="Abrir navegacao"
            aria-expanded="false"
          >
            ${iconSvg('menu')}
          </button>
        </div>
      </div>

      ${renderUserBlock(user)}
    </div>
  `

  syncSpacer()
  root._cleanupDock = bindInteractions(root)
}

function setupListeners() {
  window.addEventListener('boardsports:header-sync', () => {
    renderHeader().catch((error) => {
      console.error('Erro ao atualizar o header:', error)
    })
  })

  supabase.auth.onAuthStateChange(() => {
    renderHeader().catch((error) => {
      console.error('Erro ao sincronizar sessao no header:', error)
    })
  })
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader().catch((error) => {
    console.error('Erro ao renderizar o header:', error)
  })
  setupListeners()
})
