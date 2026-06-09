import { pesquisarGlobal } from './db_utils.js'

const ui = {
  input: document.getElementById('global-search-input'),
  button: document.getElementById('global-search-button'),
  summary: document.getElementById('global-search-summary'),
  results: document.getElementById('global-search-results')
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function runSearch() {
  const term = ui.input.value.trim()

  if (term.length < 2) {
    ui.summary.textContent = 'Escreve pelo menos 2 caracteres.'
    ui.results.innerHTML = ''
    return
  }

  ui.summary.textContent = 'A pesquisar...'
  const results = await pesquisarGlobal(term)
  ui.summary.textContent = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`

  if (!results.length) {
    ui.results.innerHTML = '<article class="map-empty-card"><p>Sem resultados para esta pesquisa.</p></article>'
    return
  }

  ui.results.innerHTML = results.map((item) => `
    <article class="spot-card">
      <span class="spot-card-tag">${escapeHtml(item.type)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description || 'Resultado BoardSports')}</p>
      <div class="spot-card-actions">
        <a class="map-primary-button" href="${escapeHtml(item.href)}">Abrir</a>
      </div>
    </article>
  `).join('')
}

ui.button.addEventListener('click', runSearch)
ui.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') runSearch()
})

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const q = params.get('q')
  if (q) {
    ui.input.value = q
    runSearch()
  }
})
