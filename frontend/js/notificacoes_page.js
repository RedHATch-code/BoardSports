import { inicializarPaginaProtegida } from './auth_utils.js'
import { marcarNotificacaoLida, obterNotificacoes } from './db_utils.js'
import { showToast } from './ui_feedback.js'

const ui = {
  count: document.getElementById('notifications-count'),
  refresh: document.getElementById('notifications-refresh'),
  list: document.getElementById('notifications-list')
}

let notifications = []

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDate(value) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })
}

async function loadNotifications() {
  notifications = await obterNotificacoes()
  render()
}

function render() {
  const unread = notifications.filter((item) => !item.lida).length
  ui.count.textContent = String(unread)

  if (!notifications.length) {
    ui.list.innerHTML = '<article class="moderation-empty-card"><p>Ainda não tens notificações.</p></article>'
    return
  }

  ui.list.innerHTML = notifications.map((item) => `
    <article class="moderation-card ${item.lida ? '' : 'is-suspicious'}">
      <div class="moderation-card-top">
        <div>
          <h3>${escapeHtml(item.titulo)}</h3>
          <p>${escapeHtml(item.mensagem || 'Sem detalhe adicional.')}</p>
        </div>
        <span class="moderation-status-badge" data-status="${item.lida ? 'aprovado' : 'pendente'}">${item.lida ? 'lida' : 'nova'}</span>
      </div>
      <div class="moderation-card-meta">
        <span>${escapeHtml(item.tipo || 'notificação')}</span>
        <span>${formatDate(item.data_criacao)}</span>
      </div>
      <div class="moderation-actions">
        ${item.link_url ? `<a class="moderation-secondary-button" href="${escapeHtml(item.link_url)}">Abrir</a>` : ''}
        ${item.lida ? '' : `<button type="button" class="moderation-primary-button" data-read="${item.id}">Marcar como lida</button>`}
      </div>
    </article>
  `).join('')
}

async function onClick(event) {
  const button = event.target.closest('[data-read]')
  if (!button) return

  const ok = await marcarNotificacaoLida(button.dataset.read)
  if (!ok) {
    showToast('Não foi possível marcar a notificação.', { type: 'error' })
    return
  }

  await loadNotifications()
}

async function init() {
  const ok = await inicializarPaginaProtegida()
  if (!ok) return

  ui.refresh.addEventListener('click', loadNotifications)
  ui.list.addEventListener('click', onClick)
  await loadNotifications()
}

document.addEventListener('DOMContentLoaded', init)
