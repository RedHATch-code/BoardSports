import { obterGaleriaVideosSpots, obterModalidades } from './db_utils.js'

const state = {
  allVideos: [],
  filteredVideos: [],
  spotFilter: null
}

const ui = {
  totalCount: document.getElementById('videos-total-count'),
  totalSpots: document.getElementById('videos-total-spots'),
  grid: document.getElementById('videos-grid'),
  search: document.getElementById('videos-search'),
  modalidadeFilter: document.getElementById('videos-modalidade-filter')
}

async function initVideosPage() {
  const url = new URL(window.location.href)
  const spotId = Number(url.searchParams.get('spot'))
  state.spotFilter = Number.isFinite(spotId) && spotId > 0 ? spotId : null

  bindEvents()
  await Promise.all([loadModalidades(), loadVideos()])
}

function bindEvents() {
  ui.search?.addEventListener('input', applyFilters)
  ui.modalidadeFilter?.addEventListener('change', applyFilters)
}

async function loadModalidades() {
  const modalidades = await obterModalidades()
  if (!ui.modalidadeFilter) return

  ui.modalidadeFilter.innerHTML = [
    '<option value="all">Todas as modalidades</option>',
    ...modalidades.map((modalidade) => `<option value="${modalidade.id}">${escapeHtml(modalidade.nome)}</option>`)
  ].join('')
}

async function loadVideos() {
  state.allVideos = await obterGaleriaVideosSpots(
    state.spotFilter ? { spot_id: state.spotFilter } : {}
  )

  applyFilters()
}

function applyFilters() {
  const search = String(ui.search?.value || '').trim().toLowerCase()
  const modalidadeId = ui.modalidadeFilter?.value || 'all'

  state.filteredVideos = state.allVideos.filter((video) => {
    const sameModalidade = modalidadeId === 'all' || Number(video.spot?.modalidade_id) === Number(modalidadeId)
    if (!sameModalidade) return false

    if (!search) return true

    const haystack = [
      video.spot?.nome,
      video.spot?.modalidades?.nome,
      video.autor?.nome,
      video.autor?.email,
      video.legenda
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search)
  })

  renderSummary()
  renderVideos()
}

function renderSummary() {
  ui.totalCount.textContent = String(state.filteredVideos.length)
  ui.totalSpots.textContent = String(new Set(state.filteredVideos.map((video) => video.spot?.id).filter(Boolean)).size)
}

function renderVideos() {
  if (!state.filteredVideos.length) {
    ui.grid.innerHTML = '<article class="videos-empty-card"><p>Ainda nao existem videos publicados com estes filtros.</p></article>'
    return
  }

  ui.grid.innerHTML = state.filteredVideos.map((video) => {
    const spotName = video.spot?.nome || 'Spot sem nome'
    const modalidade = video.spot?.modalidades?.nome || 'Spot'
    const autor = video.autor?.nome || video.autor?.email || 'Utilizador'
    const mapaHref = video.spot?.id ? `mapa.html?spot=${video.spot.id}` : 'mapa.html'

    return `
      <article class="videos-card">
        <div class="videos-card-media">
          ${buildVideoMediaMarkup(video.video_url, spotName)}
        </div>

        <div class="videos-card-top">
          <span class="videos-card-tag">${escapeHtml(modalidade)}</span>
          <small>${escapeHtml(formatDate(video.data_criacao))}</small>
        </div>

        <div class="videos-card-copy">
          <h2>${escapeHtml(spotName)}</h2>
          <p>${escapeHtml(video.legenda || 'Sem legenda adicional para este video.')}</p>
        </div>

        <div class="videos-card-meta">
          <span>Spot: ${escapeHtml(spotName)}</span>
          <span>Autor: ${escapeHtml(autor)}</span>
        </div>

        <div class="videos-card-actions">
          <a href="${escapeHtml(mapaHref)}">Abrir no mapa</a>
          <a href="${escapeHtml(video.video_url)}" target="_blank" rel="noreferrer">Abrir original</a>
        </div>
      </article>
    `
  }).join('')
}

function buildVideoMediaMarkup(url, title) {
  const embedUrl = getEmbedUrl(url)

  if (embedUrl.kind === 'iframe') {
    return `<iframe src="${escapeHtml(embedUrl.src)}" title="${escapeHtml(title)}" loading="lazy" allowfullscreen></iframe>`
  }

  if (embedUrl.kind === 'video') {
    return `<video controls preload="metadata" src="${escapeHtml(embedUrl.src)}"></video>`
  }

  return `
    <div class="videos-card-fallback">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>Este link nao suporta embed direto. Usa "Abrir original" para ver o video.</p>
      </div>
    </div>
  `
}

function getEmbedUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return { kind: 'fallback', src: '' }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(raw)) {
    return { kind: 'video', src: raw }
  }

  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return { kind: 'iframe', src: `https://www.youtube.com/embed/${parsed.pathname.replace('/', '')}` }
    }

    if (host.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').pop()
      if (videoId) {
        return { kind: 'iframe', src: `https://www.youtube.com/embed/${videoId}` }
      }
    }

    if (host.includes('vimeo.com')) {
      const videoId = parsed.pathname.split('/').filter(Boolean).pop()
      if (videoId) {
        return { kind: 'iframe', src: `https://player.vimeo.com/video/${videoId}` }
      }
    }
  } catch (error) {
    return { kind: 'fallback', src: raw }
  }

  return { kind: 'fallback', src: raw }
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

document.addEventListener('DOMContentLoaded', initVideosPage)
