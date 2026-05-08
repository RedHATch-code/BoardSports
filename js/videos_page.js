import { obterGaleriaVideosSpots, obterModalidades } from './db_utils.js'

const state = {
  allVideos: [],
  filteredVideos: [],
  spotFilter: null,
  activeView: 'shorts'
}

const ui = {
  totalCount: document.getElementById('videos-total-count'),
  totalSpots: document.getElementById('videos-total-spots'),
  grid: document.getElementById('videos-grid'),
  shortsFeed: document.getElementById('videos-shorts-feed'),
  shortsView: document.getElementById('videos-shorts-view'),
  longsView: document.getElementById('videos-longs-view'),
  shortsCount: document.getElementById('videos-shorts-count'),
  longsCount: document.getElementById('videos-longs-count'),
  tabs: [...document.querySelectorAll('[data-video-view]')],
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
  ui.tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActiveView(tab.dataset.videoView))
  })
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
  ensureActiveViewHasContent()
}

function renderSummary() {
  ui.totalCount.textContent = String(state.filteredVideos.length)
  ui.totalSpots.textContent = String(new Set(state.filteredVideos.map((video) => video.spot?.id).filter(Boolean)).size)
  ui.shortsCount.textContent = String(getVideosByFormat('shorts').length)
  ui.longsCount.textContent = String(getVideosByFormat('longs').length)
}

function renderVideos() {
  renderShortVideos()
  renderLongVideos()
}

function ensureActiveViewHasContent() {
  const shortsCount = getVideosByFormat('shorts').length
  const longsCount = getVideosByFormat('longs').length

  if (state.activeView === 'shorts' && shortsCount === 0 && longsCount > 0) {
    setActiveView('longs')
  } else if (state.activeView === 'longs' && longsCount === 0 && shortsCount > 0) {
    setActiveView('shorts')
  }
}

function renderShortVideos() {
  const videos = getVideosByFormat('shorts')

  if (!videos.length) {
    ui.shortsFeed.innerHTML = '<article class="videos-empty-card"><p>Ainda nao existem videos curtos verticais com estes filtros.</p></article>'
    return
  }

  ui.shortsFeed.innerHTML = videos.map((video) => {
    const spotName = video.spot?.nome || 'Spot sem nome'
    const modalidade = video.spot?.modalidades?.nome || 'Spot'
    const autor = video.autor?.nome || video.autor?.email || 'Utilizador'
    const mapaHref = video.spot?.id ? `mapa.html?spot=${video.spot.id}` : 'mapa.html'

    return `
      <article class="videos-short-card">
        <div class="videos-short-media">
          ${buildVideoMediaMarkup(video.video_url, spotName, 'short')}
        </div>

        <div class="videos-short-overlay">
          <span class="videos-card-tag">${escapeHtml(modalidade)}</span>
          <div>
            <h2>${escapeHtml(spotName)}</h2>
            <p>${escapeHtml(video.legenda || 'Sem legenda adicional para este video.')}</p>
            <small>${escapeHtml(autor)} · ${escapeHtml(formatDate(video.data_criacao))}</small>
          </div>
          <div class="videos-card-actions videos-short-actions">
            <a href="${escapeHtml(mapaHref)}">Mapa</a>
            <a href="${escapeHtml(video.video_url)}" target="_blank" rel="noreferrer">Original</a>
          </div>
        </div>
      </article>
    `
  }).join('')
}

function renderLongVideos() {
  const videos = getVideosByFormat('longs')

  if (!videos.length) {
    ui.grid.innerHTML = '<article class="videos-empty-card"><p>Ainda nao existem videos longos horizontais com estes filtros.</p></article>'
    return
  }

  ui.grid.innerHTML = videos.map((video) => {
    const spotName = video.spot?.nome || 'Spot sem nome'
    const modalidade = video.spot?.modalidades?.nome || 'Spot'
    const autor = video.autor?.nome || video.autor?.email || 'Utilizador'
    const mapaHref = video.spot?.id ? `mapa.html?spot=${video.spot.id}` : 'mapa.html'

    return `
      <article class="videos-card">
        <div class="videos-card-media">
          ${buildVideoMediaMarkup(video.video_url, spotName, 'long')}
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

function setActiveView(view) {
  if (!['shorts', 'longs'].includes(view)) return

  state.activeView = view
  const showShorts = view === 'shorts'

  ui.shortsView.hidden = !showShorts
  ui.longsView.hidden = showShorts
  ui.shortsView.classList.toggle('is-active', showShorts)
  ui.longsView.classList.toggle('is-active', !showShorts)

  ui.tabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.videoView === view)
  })
}

function getVideosByFormat(format) {
  return state.filteredVideos.filter((video) => classifyVideoFormat(video.video_url) === format)
}

function classifyVideoFormat(url) {
  const raw = String(url || '').trim().toLowerCase()

  if (
    raw.includes('/shorts/')
    || raw.includes('youtube.com/shorts')
    || raw.includes('tiktok.com')
    || raw.includes('/reel/')
    || raw.includes('/reels/')
    || raw.includes('instagram.com/reel')
  ) {
    return 'shorts'
  }

  return 'longs'
}

function buildVideoMediaMarkup(url, title, layout = 'long') {
  const embedUrl = getEmbedUrl(url)
  const className = layout === 'short' ? ' class="is-short-video"' : ''

  if (embedUrl.kind === 'iframe') {
    return `<iframe${className} src="${escapeHtml(embedUrl.src)}" title="${escapeHtml(title)}" loading="lazy" allowfullscreen></iframe>`
  }

  if (embedUrl.kind === 'video') {
    return `<video${className} controls preload="metadata" src="${escapeHtml(embedUrl.src)}"></video>`
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
      const videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
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
