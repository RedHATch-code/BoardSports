import { obterUsuarioAtual } from './auth_utils.js'
import {
  analisarVideoUrl,
  apagarVideoSpot,
  apagarSpot,
  atualizarSpot,
  criarSubmissãoXp,
  criarSpot,
  obterConquistasDiarias,
  obterCategoriasPorModalidade,
  obterGaleriaVídeosSpots,
  obterManobras,
  obterModalidades,
  obterSpots,
  publicarVideoSpot,
  reclamarConquistaDiaria
} from './db_utils.js'
import { showConfirm, showToast } from './ui_feedback.js'

let map = null
let user = null
let currentModalidade = 'all'
let currentCategoria = 'all'
let currentCountry = ''
let currentCreator = ''
let allLoadedSpots = []
let currentSpots = []
let currentVideos = []
let spotEditingId = null
let pickingLocation = false
let activeVideoSpotId = null
let activeXpSpotId = null
let userLocationMarker = null
let draftSpotMarker = null
let currentManobras = []
let mapFocusExitButton = null

const markerBySpotId = new Map()
const videoCountBySpotId = new Map()

const defaultModalidades = [
  { id: 1, nome: 'Surf' },
  { id: 2, nome: 'Skate' },
  { id: 3, nome: 'Skimboard' },
  { id: 4, nome: 'Snowboard' },
  { id: 5, nome: 'Sandboard' }
]

const defaultCategoriasByModalidade = {
  Surf: [
    'Shortboard',
    'Fish',
    'Funboard / Mini-malibu',
    'Longboard',
    'Gun',
    'Softboard',
    'Big Wave',
    'Tow-in Surf',
    'Bodyboard',
    'Bodysurf',
    'Stand Up Paddle (SUP Surf)'
  ],
  Skate: [
    'Street',
    'Park',
    'Vert',
    'Bowl / Pool',
    'Freestyle',
    'Downhill',
    'Cruising',
    'Longboard - Dancing',
    'Longboard - Freeride',
    'Slalom'
  ],
  Skimboard: [
    'Flatland',
    'Wave Skimming',
    'Freestyle',
    'Technical / Tricks',
    'Cruising / Recreativo'
  ],
  Snowboard: [
    'Freeride',
    'Freestyle',
    'Park',
    'Jibbing',
    'Halfpipe',
    'Slopestyle',
    'Big Air',
    'Boardercross / Snowboard Cross',
    'Alpine / Carving',
    'Splitboard',
    'Backcountry'
  ],
  Sandboard: [
    'Freeride',
    'Downhill / Speed',
    'Freestyle',
    'Dune Jumping',
    'Carving',
    'Boardercross',
    'Sled / Sit-down'
  ]
}

const seasonRelevantSports = new Set(['surf', 'skimboard', 'snowboard'])
const seasonMonths = [
  { value: 1, short: 'Jan' },
  { value: 2, short: 'Fev' },
  { value: 3, short: 'Mar' },
  { value: 4, short: 'Abr' },
  { value: 5, short: 'Mai' },
  { value: 6, short: 'Jun' },
  { value: 7, short: 'Jul' },
  { value: 8, short: 'Ago' },
  { value: 9, short: 'Set' },
  { value: 10, short: 'Out' },
  { value: 11, short: 'Nov' },
  { value: 12, short: 'Dez' }
]

const ui = {
  totalSpots: document.getElementById('map-total-spots'),
  totalVideos: document.getElementById('map-total-videos'),
  filter: document.getElementById('filter-modalidade'),
  categoryFilter: document.getElementById('filter-categoria'),
  countryFilter: document.getElementById('filter-country'),
  creatorFilter: document.getElementById('filter-criador'),
  btnClearFilters: document.getElementById('btn-clear-filters'),
  btnMyLocation: document.getElementById('btn-my-location'),
  btnAddSpot: document.getElementById('btn-add-spot'),
  spotsContainer: document.getElementById('spots-container'),
  dailyAchievements: document.getElementById('daily-achievements'),
  spotModal: document.getElementById('modal-spot'),
  spotModalTitle: document.getElementById('spot-modal-title'),
  spotForm: document.getElementById('form-spot'),
  spotNome: document.getElementById('spot-nome'),
  spotDescricao: document.getElementById('spot-descricao'),
  spotModalidade: document.getElementById('spot-modalidade'),
  spotCategoria: document.getElementById('spot-categoria'),
  spotDificuldade: document.getElementById('spot-dificuldade'),
  spotSeasonPanel: document.getElementById('spot-season-panel'),
  spotSeasonMonths: document.getElementById('spot-season-months'),
  spotSeasonNotes: document.getElementById('spot-season-notes'),
  spotLocationQuery: document.getElementById('spot-location-query'),
  spotLocationStatus: document.getElementById('spot-location-status'),
  btnSearchSpotLocation: document.getElementById('btn-search-spot-location'),
  btnPickSpotOnMap: document.getElementById('btn-pick-spot-on-map'),
  spotLat: document.getElementById('spot-lat'),
  spotLng: document.getElementById('spot-lng'),
  videoModal: document.getElementById('modal-video'),
  videoModalTitle: document.getElementById('video-modal-title'),
  videoModalCopy: document.getElementById('video-modal-spot-copy'),
  videoForm: document.getElementById('form-video'),
  videoUrl: document.getElementById('video-url'),
  videoLegenda: document.getElementById('video-legenda'),
  videoTipoAutoria: document.getElementById('video-tipo-autoria'),
  videoXpPreview: document.getElementById('video-xp-preview'),
  videoAnalysis: document.getElementById('video-analysis'),
  xpModal: document.getElementById('modal-xp'),
  xpModalTitle: document.getElementById('xp-modal-title'),
  xpModalCopy: document.getElementById('xp-modal-copy'),
  xpForm: document.getElementById('form-xp'),
  xpTipo: document.getElementById('xp-tipo'),
  xpManobraField: document.getElementById('xp-manobra-field'),
  xpManobra: document.getElementById('xp-manobra'),
  xpProvaUrl: document.getElementById('xp-prova-url'),
  xpPreview: document.getElementById('xp-preview')
}

async function initMapPage() {
  initMap()
  renderSeasonMonthControls()
  bindEvents()
  user = await obterUsuarioAtual()
  await loadModalidadeOptions()
  await loadSpots()
  await loadDailyAchievements()
}

function initMap() {
  map = L.map('map', {
    preferCanvas: true,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false
  }).setView([39.5, -8.5], 7)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 2
  }).addTo(map)

  map.on('click', handleMapClick)
}

function bindEvents() {
  ui.filter?.addEventListener('change', async (event) => {
    currentModalidade = event.target.value
    currentCategoria = 'all'
    await loadFilterCategorias(currentModalidade)
    await loadSpots()
  })

  ui.categoryFilter?.addEventListener('change', async (event) => {
    currentCategoria = event.target.value
    await loadSpots()
  })

  ui.countryFilter?.addEventListener('input', debounce((event) => {
    currentCountry = event.target.value
    applyTextFiltersAndRender()
  }, 180))

  ui.creatorFilter?.addEventListener('input', debounce((event) => {
    currentCreator = event.target.value
    applyTextFiltersAndRender()
  }, 180))

  ui.btnAddSpot?.addEventListener('click', () => {
    startNewSpot()
  })

  ui.btnMyLocation?.addEventListener('click', focusUserLocation)
  ui.btnClearFilters?.addEventListener('click', clearMapFilters)

  ui.spotModal.querySelectorAll('[data-close-spot]').forEach((button) => {
    button.addEventListener('click', closeSpotModal)
  })

  ui.videoModal.querySelectorAll('[data-close-video]').forEach((button) => {
    button.addEventListener('click', closeVideoModal)
  })

  ui.xpModal.querySelectorAll('[data-close-xp]').forEach((button) => {
    button.addEventListener('click', closeXpModal)
  })

  ui.spotForm?.addEventListener('submit', submitSpotForm)
  ui.videoForm?.addEventListener('submit', submitVideoForm)
  ui.xpForm?.addEventListener('submit', submitXpForm)
  ui.videoUrl?.addEventListener('input', renderVideoAnalysis)
  ui.videoTipoAutoria?.addEventListener('change', renderVideoXpPreview)
  ui.xpTipo?.addEventListener('change', renderXpSubmissionState)
  ui.xpManobra?.addEventListener('change', renderXpSubmissionState)
  ui.dailyAchievements?.addEventListener('click', handleDailyAchievementClick)
  document.addEventListener('click', handleSpotActionClick)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') exitMobileMapFocus()
  })
  ui.btnSearchSpotLocation?.addEventListener('click', searchSpotLocation)
  ui.btnPickSpotOnMap?.addEventListener('click', enableSpotMapPicking)
  ui.spotLocationQuery?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    searchSpotLocation()
  })
  ui.spotLat?.addEventListener('input', syncDraftSpotMarkerFromInputs)
  ui.spotLng?.addEventListener('input', syncDraftSpotMarkerFromInputs)

  ui.spotModalidade?.addEventListener('change', async (event) => {
    const modalidadeId = event.target.value
    await loadCategorias(modalidadeId)
    updateSpotSeasonVisibility(true)
  })

  window.addEventListener('click', (event) => {
    if (event.target === ui.spotModal) closeSpotModal()
    if (event.target === ui.videoModal) closeVideoModal()
    if (event.target === ui.xpModal) closeXpModal()
  })
}

async function loadSpots() {
  allLoadedSpots = await obterSpots({
    modalidade_id: currentModalidade,
    categoria_id: isNumericId(currentCategoria) ? currentCategoria : 'all'
  })
  currentSpots = filterLoadedSpots(allLoadedSpots)
  currentVideos = currentSpots.length
    ? await obterGaleriaVídeosSpots({ spot_ids: currentSpots.map((spot) => spot.id) })
    : []

  rebuildVideoCounts()
  renderSummary()
  renderMarkers()
  renderSpotCards()
  focusSpotFromQuery()
}

async function clearMapFilters() {
  currentModalidade = 'all'
  currentCategoria = 'all'
  currentCountry = ''
  currentCreator = ''

  if (ui.filter) ui.filter.value = 'all'
  if (ui.countryFilter) ui.countryFilter.value = ''
  if (ui.creatorFilter) ui.creatorFilter.value = ''
  await loadFilterCategorias('all')
  await loadSpots()
  showToast('Filtros limpos.', { type: 'info' })
}

async function applyTextFiltersAndRender() {
  currentSpots = filterLoadedSpots(allLoadedSpots)
  currentVideos = currentSpots.length
    ? await obterGaleriaVídeosSpots({ spot_ids: currentSpots.map((spot) => spot.id) })
    : []

  rebuildVideoCounts()
  renderSummary()
  renderMarkers()
  renderSpotCards()
}

function filterLoadedSpots(spots = []) {
  const country = normalizeSearch(currentCountry)
  const creator = normalizeSearch(currentCreator)

  return spots.filter((spot) => {
    const creatorText = normalizeSearch([
      spot.profiles?.nome,
      spot.profiles?.email,
      spot.criador_nome,
      spot.criador_id
    ].filter(Boolean).join(' '))
    const countryText = normalizeSearch([
      spot.país,
      spot.country,
      spot.localização,
      spot.morada,
      spot.nome,
      spot.descricao
    ].filter(Boolean).join(' '))

    return (!country || countryText.includes(country)) && (!creator || creatorText.includes(creator))
  })
}

async function loadDailyAchievements() {
  if (!ui.dailyAchievements) return

  if (!user) {
    ui.dailyAchievements.innerHTML = '<article class="map-empty-card"><p>Faz login para reclamar conquistas diárias de XP.</p></article>'
    return
  }

  const achievements = await obterConquistasDiarias(user.id)
  renderDailyAchievements(achievements)
}

function renderDailyAchievements(achievements = []) {
  if (!achievements.length) {
    ui.dailyAchievements.innerHTML = '<article class="map-empty-card"><p>Não foi possível carregar as conquistas diárias.</p></article>'
    return
  }

  ui.dailyAchievements.innerHTML = achievements.map((achievement) => {
    const buttonLabel = achievement.reclamada
      ? 'Reclamada'
      : achievement.concluída
        ? `Reclamar +${achievement.xp} XP`
        : 'Por concluir'

    return `
      <article class="daily-achievement-card ${achievement.reclamada ? 'is-claimed' : ''}">
        <div>
          <span class="daily-achievement-xp">+${Number(achievement.xp || 0)} XP</span>
          <h3>${escapeHtml(achievement.titulo)}</h3>
          <p>${escapeHtml(achievement.descricao)}</p>
          <small>${achievement.concluída ? 'Objetivo concluído hoje' : 'Ainda falta completar hoje'}</small>
        </div>
        <button
          type="button"
          class="map-secondary-button"
          data-daily-achievement="${escapeHtml(achievement.codigo)}"
          ${achievement.concluída && !achievement.reclamada ? '' : 'disabled'}
        >${escapeHtml(buttonLabel)}</button>
      </article>
    `
  }).join('')
}

async function handleDailyAchievementClick(event) {
  const button = event.target.closest('[data-daily-achievement]')
  if (!button) return

  button.disabled = true
  const result = await reclamarConquistaDiaria(button.dataset.dailyAchievement)

  if (result?.sucesso) {
    showToast(`Conquista reclamada: +${result.xp_ganho} XP.`, { type: 'success' })
  } else {
    showToast(result?.erro || 'Não foi possível reclamar a conquista.', { type: 'error' })
  }

  user = await obterUsuarioAtual()
  await loadDailyAchievements()
}

function handleSpotActionClick(event) {
  const emptyAction = event.target.closest('[data-map-empty-action]')
  if (emptyAction) {
    if (emptyAction.dataset.mapEmptyAction === 'clear') {
      clearMapFilters()
    } else if (emptyAction.dataset.mapEmptyAction === 'create') {
      startNewSpot()
    }
    return
  }

  const button = event.target.closest('[data-spot-action]')
  if (!button) return

  const action = button.dataset.spotAction
  const videoId = button.dataset.videoId

  if (action === 'delete-video' && videoId) {
    deleteSpotVideo(videoId)
    return
  }

  const spotId = Number(button.dataset.spotId)
  if (!Number.isFinite(spotId)) return

  if (action === 'focus') {
    focusSpotOnMap(spotId)
    return
  }

  if (action === 'video') {
    window.openVideoPublishModal(spotId)
    return
  }

  if (action === 'xp') {
    window.openXpSubmissionModal(spotId)
    return
  }

  if (action === 'edit') {
    editSpot(spotId)
    return
  }

  if (action === 'delete') {
    deleteSpot(spotId)
  }
}

async function loadModalidadeOptions() {
  const modalidades = await obterModalidades()
  const options = modalidades.length ? modalidades : defaultModalidades

  if (ui.filter) {
    ui.filter.innerHTML = [
      '<option value="all">Todas as modalidades</option>',
      ...options.map((modalidade) => `<option value="${modalidade.id}">${escapeHtml(modalidade.nome)}</option>`)
    ].join('')
  }

  if (ui.spotModalidade) {
    ui.spotModalidade.innerHTML = [
      '<option value="">Selecionar modalidade</option>',
      ...options.map((modalidade) => `<option value="${modalidade.id}">${escapeHtml(modalidade.nome)}</option>`)
    ].join('')
  }
}

function rebuildVideoCounts() {
  videoCountBySpotId.clear()

  currentSpots.forEach((spot) => {
    if (spot.video_url) {
      videoCountBySpotId.set(spot.id, 1)
    }
  })

  currentVideos.forEach((video) => {
    const currentCount = videoCountBySpotId.get(video.spot_id) || 0
    videoCountBySpotId.set(video.spot_id, currentCount + 1)
  })
}

function renderSummary() {
  ui.totalSpots.textContent = String(currentSpots.length)
  ui.totalVideos.textContent = String([...videoCountBySpotId.values()].reduce((sum, count) => sum + count, 0))
}

function renderMarkers() {
  markerBySpotId.forEach((marker) => map.removeLayer(marker))
  markerBySpotId.clear()

  currentSpots.forEach((spot, index) => {
    const lat = Number(spot.coordenadas_lat)
    const lng = Number(spot.coordenadas_long)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'map-spot-marker',
        html: `<div style="width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#d66d24;color:#111;font-weight:800;border:2px solid #fff;">${index + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -24]
      })
    }).addTo(map)

    marker.bindPopup(buildSpotPopup(spot))
    markerBySpotId.set(spot.id, marker)
  })

  fitMapToVisibleSpots()
}

function buildSpotPopup(spot) {
  const videoCount = videoCountBySpotId.get(spot.id) || 0
  const canEdit = user && spot.criador_id === user.id
  const dificuldade = formatSpotDifficulty(spot.dificuldade)
  const bestSeason = formatBestSeason(spot)
  const directionsUrl = buildDirectionsUrl(spot)

  return `
    <div style="min-width:220px;color:#f3f4f6;">
      <strong style="display:block;font-size:1rem;margin-bottom:8px;">${escapeHtml(spot.nome)}</strong>
      <p style="margin:0 0 6px;color:#c7c9d1;">${escapeHtml(spot.modalidades?.nome || 'Spot')} · ${escapeHtml(spot.categorias?.nome || 'Geral')}</p>
      <p style="margin:0 0 6px;color:#ffd6a3;">Dificuldade: ${escapeHtml(dificuldade.label)}</p>
      ${bestSeason ? `<p style="margin:0 0 6px;color:#b8f1f2;">Melhor altura: ${escapeHtml(bestSeason)}</p>` : ''}
      <p style="margin:0 0 10px;color:#9ca3af;">${escapeHtml(spot.descricao || 'Sem descrição adicional.')}</p>
      <p style="margin:0 0 12px;color:#ffd6a3;">${videoCount} ${videoCount === 1 ? 'vídeo ligado' : 'vídeos ligados'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" data-spot-action="focus" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#f3f4f6;cursor:pointer;">Focar</button>
        <a href="/spot.html?id=${spot.id}" style="min-height:36px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#f3f4f6;text-decoration:none;">Página</a>
        <a href="${escapeHtml(directionsUrl)}" target="_blank" rel="noreferrer" style="min-height:36px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px;border:1px solid rgba(47,158,163,0.24);background:rgba(47,158,163,0.14);color:#b8f1f2;text-decoration:none;">Direções</a>
        <button type="button" data-spot-action="video" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:0;background:linear-gradient(135deg,#f5d7b5 0%,#d66d24 100%);color:#141414;font-weight:700;cursor:pointer;">Publicar vídeo</button>
        <button type="button" data-spot-action="xp" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:1px solid rgba(47,158,163,0.24);background:rgba(47,158,163,0.14);color:#b8f1f2;font-weight:700;cursor:pointer;">Submeter XP</button>
        ${canEdit ? `<button type="button" data-spot-action="edit" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:0;background:#2f343d;color:#f3f4f6;cursor:pointer;">Editar</button>` : ''}
      </div>
    </div>
  `
}

function renderSpotCards() {
  if (!currentSpots.length) {
    ui.spotsContainer.innerHTML = `
      <article class="map-empty-card">
        <h2>Sem spots para estes filtros.</h2>
        <p>Limpa os filtros ou cria um novo spot para abrir uma nova zona no mapa.</p>
        <div class="spot-card-actions">
          <button type="button" class="map-secondary-button has-ui-icon icon-refresh" data-map-empty-action="clear">Limpar filtros</button>
          <button type="button" class="map-primary-button has-ui-icon icon-plus" data-map-empty-action="create">Novo spot</button>
        </div>
      </article>
    `
    return
  }

  ui.spotsContainer.innerHTML = currentSpots.map((spot) => {
    const videoCount = videoCountBySpotId.get(spot.id) || 0
    const canEdit = user && spot.criador_id === user.id
    const dificuldade = formatSpotDifficulty(spot.dificuldade)
    const spotVídeos = getVídeosForSpot(spot.id)
    const previewUrl = buildSpotPreviewUrl(spot)
    const directionsUrl = buildDirectionsUrl(spot)
    const bestSeason = formatBestSeason(spot)

    return `
      <article class="spot-card">
        <div class="spot-preview">
          <img src="${escapeHtml(previewUrl)}" alt="Preview de localização para ${escapeHtml(spot.nome)}" width="640" height="360" loading="lazy" decoding="async">
          <div class="spot-preview-overlay">
            <span>${Number(spot.coordenadas_lat).toFixed(3)}, ${Number(spot.coordenadas_long).toFixed(3)}</span>
          </div>
        </div>

        <div class="spot-card-top">
          <div>
            <span class="spot-card-tag">${escapeHtml(spot.modalidades?.nome || 'Spot')}</span>
            <span class="spot-difficulty-tag" data-difficulty="${escapeHtml(dificuldade.value)}">${escapeHtml(dificuldade.label)} · +${dificuldade.xp} XP</span>
          </div>
          <small>${videoCount} ${videoCount === 1 ? 'vídeo' : 'vídeos'}</small>
        </div>

        <div>
          <h3>${escapeHtml(spot.nome)}</h3>
        </div>

        <p>${escapeHtml(spot.descricao || 'Sem descrição adicional para este spot.')}</p>

        <div class="spot-card-meta">
          <span>Categoria: ${escapeHtml(spot.categorias?.nome || 'Geral')}</span>
          <span>Autor: ${escapeHtml(spot.profiles?.nome || spot.profiles?.email || 'Utilizador')}</span>
          <span>Coordenadas: ${Number(spot.coordenadas_lat).toFixed(3)}, ${Number(spot.coordenadas_long).toFixed(3)}</span>
        </div>

        ${bestSeason ? `
          <div class="spot-season-readout">
            <strong>Melhor altura</strong>
            <span>${escapeHtml(bestSeason)}</span>
          </div>
        ` : ''}

        ${renderSpotVideoList(spotVídeos)}

        <div class="spot-card-actions">
          <button type="button" class="map-focus-button has-ui-icon icon-map" data-spot-action="focus" data-spot-id="${spot.id}">Abrir no mapa</button>
          <a class="map-secondary-button has-ui-icon icon-open" href="/spot.html?id=${spot.id}">Página do spot</a>
          <a class="map-directions-button has-ui-icon icon-location" href="${escapeHtml(directionsUrl)}" target="_blank" rel="noreferrer">Direções</a>
          <button type="button" class="map-video-button has-ui-icon icon-video" data-spot-action="video" data-spot-id="${spot.id}">Publicar vídeo</button>
          <button type="button" class="map-xp-button has-ui-icon icon-ranking" data-spot-action="xp" data-spot-id="${spot.id}">Submeter XP</button>
          ${canEdit ? `<button type="button" class="map-edit-button has-ui-icon icon-edit" data-spot-action="edit" data-spot-id="${spot.id}">Editar</button>` : ''}
          ${canEdit ? `<button type="button" class="map-delete-button" data-spot-action="delete" data-spot-id="${spot.id}">Apagar</button>` : ''}
        </div>
      </article>
    `
  }).join('')
}

function renderSpotVideoList(videos = []) {
  if (!videos.length) return ''

  return `
    <div class="spot-video-list">
      <strong>Vídeos deste spot</strong>
      ${videos.slice(0, 3).map((video) => {
        const canDelete = user && (video.autor_id === user.id || user.perfil?.is_admin)
        const analysis = video.analise_resultado || analisarVideoUrl(video.video_url)

        return `
          <article class="spot-video-item">
            <div>
              <span>${escapeHtml(video.legenda || 'Vídeo publicado')}</span>
              <small>${escapeHtml(analysis.formato === 'short' ? 'Curto vertical' : 'Longo horizontal')} · ${escapeHtml(video.plataforma || analysis.plataforma || 'link')}</small>
            </div>
            <div class="spot-video-actions">
              <a href="${escapeHtml(video.video_url)}" target="_blank" rel="noreferrer">Ver</a>
              ${canDelete ? `<button type="button" data-spot-action="delete-video" data-video-id="${escapeHtml(video.id)}">Apagar</button>` : ''}
            </div>
          </article>
        `
      }).join('')}
      ${videos.length > 3 ? `<small>+${videos.length - 3} vídeos adicionais na galeria.</small>` : ''}
    </div>
  `
}

function handleMapClick(event) {
  if (!pickingLocation) {
    enterMobileMapFocus()
    return
  }

  setSpotCoordinates(event.latlng.lat, event.latlng.lng, true)
  openSpotModal()
  pickingLocation = false
  setSpotLocationStatus('Localização definida a partir do mapa.')
}

function enterMobileMapFocus() {
  if (!window.matchMedia('(max-width: 720px)').matches) return
  if (document.body.classList.contains('map-focus-mode')) return

  document.body.classList.add('map-focus-mode')
  if (!mapFocusExitButton) {
    mapFocusExitButton = document.createElement('button')
    mapFocusExitButton.type = 'button'
    mapFocusExitButton.className = 'map-focus-exit'
    mapFocusExitButton.textContent = 'Sair do mapa'
    mapFocusExitButton.addEventListener('click', exitMobileMapFocus)
    document.body.appendChild(mapFocusExitButton)
  }

  window.setTimeout(() => map?.invalidateSize(), 80)
}

function exitMobileMapFocus() {
  if (!document.body.classList.contains('map-focus-mode')) return
  document.body.classList.remove('map-focus-mode')
  window.setTimeout(() => map?.invalidateSize(), 80)
}

function renderSeasonMonthControls() {
  if (!ui.spotSeasonMonths) return

  ui.spotSeasonMonths.innerHTML = seasonMonths.map((month) => `
    <label>
      <input type="checkbox" value="${month.value}">
      <span>${month.short}</span>
    </label>
  `).join('')
}

function normalizeSportName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isSeasonRelevantModalidade(modalidadeId = ui.spotModalidade?.value) {
  const modalidade = getModalidadeFromSelect(modalidadeId)
  return seasonRelevantSports.has(normalizeSportName(modalidade?.nome))
}

function updateSpotSeasonVisibility(clearValues = false) {
  if (!ui.spotSeasonPanel) return

  const isRelevant = isSeasonRelevantModalidade()
  ui.spotSeasonPanel.hidden = !isRelevant

  if (!isRelevant || clearValues) {
    if (clearValues || !isRelevant) setSelectedSeasonMonths([])
    if ((clearValues || !isRelevant) && ui.spotSeasonNotes) ui.spotSeasonNotes.value = ''
  }
}

function getSelectedSeasonMonths() {
  if (!ui.spotSeasonMonths) return []

  return [...ui.spotSeasonMonths.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => Number(input.value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12)
}

function setSelectedSeasonMonths(months = []) {
  if (!ui.spotSeasonMonths) return

  const selected = new Set((months || []).map((value) => Number(value)))
  ui.spotSeasonMonths.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(Number(input.value))
  })
}

function formatBestSeason(spot) {
  const months = Array.isArray(spot?.melhor_epoca_meses)
    ? spot.melhor_epoca_meses
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12)
      .sort((first, second) => first - second)
    : []
  const monthLabel = months
    .map((value) => seasonMonths.find((month) => month.value === value)?.short)
    .filter(Boolean)
    .join(', ')
  const notes = String(spot?.melhor_epoca_notas || '').trim()

  return [monthLabel, notes].filter(Boolean).join(' - ')
}

async function submitSpotForm(event) {
  event.preventDefault()

  user = await obterUsuarioAtual()
  if (!user) {
    showToast('Faz login para criar ou editar spots.', { type: 'warning' })
    return
  }

  const bestSeasonRelevant = isSeasonRelevantModalidade()
  const payload = {
    nome: ui.spotNome.value.trim(),
    descricao: ui.spotDescricao.value.trim(),
    modalidade_id: Number(ui.spotModalidade.value),
    categoria_id: isNumericId(ui.spotCategoria.value) ? Number(ui.spotCategoria.value) : null,
    dificuldade: ui.spotDificuldade.value || 'facil',
    melhor_epoca_meses: bestSeasonRelevant ? getSelectedSeasonMonths() : [],
    melhor_epoca_notas: bestSeasonRelevant ? ui.spotSeasonNotes.value.trim() || null : null,
    coordenadas_lat: Number(ui.spotLat.value),
    coordenadas_long: Number(ui.spotLng.value),
    criador_id: user.id
  }

  if (!payload.nome || !payload.modalidade_id || !Number.isFinite(payload.coordenadas_lat) || !Number.isFinite(payload.coordenadas_long)) {
    showToast('Preenche os campos obrigatorios do spot.', { type: 'warning' })
    return
  }

  if (!isValidLatitude(payload.coordenadas_lat) || !isValidLongitude(payload.coordenadas_long)) {
    showToast('As coordenadas do spot não são válidas.', { type: 'warning' })
    return
  }

  if (spotEditingId) {
    const updated = await atualizarSpot(spotEditingId, payload)
    if (!updated) {
      showToast('Não foi possível atualizar o spot.', { type: 'error' })
      return
    }

    showToast('Spot atualizado com sucesso.', { type: 'success' })
  } else {
    const created = await criarSpot(payload)
    if (!created) {
      showToast('Não foi possível criar o spot.', { type: 'error' })
      return
    }

    showToast('Spot criado com sucesso.', { type: 'success' })
  }

  closeSpotModal()
  await loadSpots()
  await loadDailyAchievements()
}

async function submitVideoForm(event) {
  event.preventDefault()

  user = await obterUsuarioAtual()
  if (!user) {
    showToast('Faz login para publicar vídeos num spot.', { type: 'warning' })
    return
  }

  const videoUrl = ui.videoUrl.value.trim()
  const tipoAutoria = ui.videoTipoAutoria?.value || 'proprio'
  if (!videoUrl) {
    showToast('Indica o URL do vídeo.', { type: 'warning' })
    return
  }

  if (!['proprio', 'filmado', 'terceiros'].includes(tipoAutoria)) {
    showToast('Indica se és tu no vídeo, se filmaste alguém ou se é de terceiros.', { type: 'warning' })
    return
  }

  const resultado = await publicarVideoSpot({
    spot_id: activeVideoSpotId,
    autor_id: user.id,
    video_url: videoUrl,
    legenda: ui.videoLegenda.value.trim(),
    tipo_autoria: tipoAutoria
  })

  if (!resultado?.sucesso) {
    showToast(resultado?.erro || 'Não foi possível publicar o vídeo.', { type: 'error', duration: 4800 })
    return
  }

  showToast('Vídeo publicado com sucesso.', { type: 'success' })
  closeVideoModal()
  await loadSpots()
  await loadDailyAchievements()
}

async function submitXpForm(event) {
  event.preventDefault()

  user = await obterUsuarioAtual()
  if (!user) {
    showToast('Faz login para submeter XP.', { type: 'warning' })
    return
  }

  const spot = currentSpots.find((item) => Number(item.id) === Number(activeXpSpotId))
  if (!spot) {
    showToast('Spot inválido para submissão XP.', { type: 'error' })
    return
  }

  const tipo = ui.xpTipo.value
  const manobraId = tipo === 'manobra' ? Number(ui.xpManobra.value) : null
  const selectedManobra = currentManobras.find((item) => Number(item.id) === Number(manobraId))
  const provaUrl = ui.xpProvaUrl.value.trim()
  const spotDifficulty = formatSpotDifficulty(spot.dificuldade)
  const xpPrevisto = tipo === 'manobra'
    ? Number(selectedManobra?.xp || 0)
    : Number(spotDifficulty.xp || 0)

  if (!provaUrl) {
    showToast('Indica o URL da prova antes de enviar.', { type: 'warning' })
    return
  }

  if (tipo === 'manobra' && !selectedManobra) {
    showToast('Escolhe uma manobra valida.', { type: 'warning' })
    return
  }

  const result = await criarSubmissãoXp({
    user_id: user.id,
    spot_id: spot.id,
    manobra_id: tipo === 'manobra' ? selectedManobra.id : null,
    combo_id: null,
    tipo,
    prova_url: provaUrl,
    latitude: null,
    longitude: null,
    distancia_spot_metros: null,
    xp_previsto: xpPrevisto
  })

  if (!result?.sucesso) {
    showToast(result?.erro || 'Não foi possível criar a submissão XP.', { type: 'error', duration: 5200 })
    return
  }

  showToast('Submissão XP enviada para moderação.', { type: 'success' })
  closeXpModal()
}

function getVideoAuthoringXp(tipoAutoria = 'proprio') {
  const xpByType = {
    proprio: 40,
    filmado: 20,
    terceiros: 0
  }

  return xpByType[tipoAutoria] ?? xpByType.proprio
}

function renderVideoXpPreview() {
  if (!ui.videoXpPreview) return

  const tipoAutoria = ui.videoTipoAutoria?.value || 'proprio'
  const xp = getVideoAuthoringXp(tipoAutoria)
  const labels = {
    proprio: 'O vídeo mostra-te a praticar o desporto.',
    filmado: 'Tu gravaste outra pessoa a praticar. Vale metade dos pontos.',
    terceiros: 'O vídeo é de terceiros. Fica publicado, mas não atribui XP.'
  }

  ui.videoXpPreview.innerHTML = `
    <strong>XP do vídeo: +${xp}</strong>
    <p>${escapeHtml(labels[tipoAutoria] || labels.proprio)}</p>
  `
}

function renderVideoAnalysis() {
  if (!ui.videoAnalysis) return

  const analysis = analisarVideoUrl(ui.videoUrl.value)
  const warnings = analysis.avisos?.length
    ? `<ul>${analysis.avisos.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : ''
  const suggestions = analysis.sugestoes?.length
    ? `<p>${escapeHtml(analysis.sugestoes[0])}</p>`
    : '<p>Cola um link para analisar plataforma, formato e compatibilidade antes de publicar.</p>'

  ui.videoAnalysis.innerHTML = `
    <strong>Analisador de vídeo</strong>
    <div class="video-analysis-meta">
      <span>${escapeHtml(analysis.plataforma)}</span>
      <span>${analysis.formato === 'short' ? 'Curto vertical' : 'Longo horizontal'}</span>
      <span>Score ${Number(analysis.score || 0)}/100</span>
    </div>
    ${suggestions}
    ${warnings}
  `
}

async function loadCategorias(modalidadeId, selectedCategoriaId = '') {
  if (!modalidadeId) {
    ui.spotCategoria.disabled = true
    ui.spotCategoria.innerHTML = '<option value="">Selecionar categoria</option>'
    return
  }

  const categorias = await loadCategoriasWithFallback(modalidadeId)
  ui.spotCategoria.disabled = false
  ui.spotCategoria.innerHTML = [
    '<option value="">Selecionar categoria</option>',
    ...categorias.map((categoria) => `<option value="${categoria.id}" ${String(selectedCategoriaId) === String(categoria.id) ? 'selected' : ''}>${escapeHtml(categoria.nome)}</option>`)
  ].join('')
}

async function loadFilterCategorias(modalidadeId) {
  if (!ui.categoryFilter) return

  if (!modalidadeId || modalidadeId === 'all') {
    ui.categoryFilter.disabled = true
    ui.categoryFilter.innerHTML = '<option value="all">Todas as categorias</option>'
    return
  }

  const categorias = await loadCategoriasWithFallback(modalidadeId)
  ui.categoryFilter.disabled = false
  ui.categoryFilter.innerHTML = [
    '<option value="all">Todas as categorias</option>',
    ...categorias.map((categoria) => `<option value="${categoria.id}">${escapeHtml(categoria.nome)}</option>`)
  ].join('')

  if (!categorias.length) {
    ui.categoryFilter.innerHTML = '<option value="all">Sem categorias nesta modalidade</option>'
  }
}

async function loadCategoriasWithFallback(modalidadeId) {
  const categorias = await obterCategoriasPorModalidade(modalidadeId)
  if (categorias.length) return categorias

  const modalidade = getModalidadeFromSelect(modalidadeId)
  const fallbackNames = defaultCategoriasByModalidade[modalidade?.nome] || []

  return fallbackNames.map((nome, index) => ({
    id: `fallback-${modalidadeId}-${index}`,
    nome
  }))
}

function getModalidadeFromSelect(modalidadeId) {
  const selectedOption = ui.spotModalidade?.querySelector(`option[value="${modalidadeId}"]`)
    || ui.filter?.querySelector(`option[value="${modalidadeId}"]`)

  if (selectedOption) {
    return {
      id: Number(modalidadeId),
      nome: selectedOption.textContent.trim()
    }
  }

  return defaultModalidades.find((modalidade) => String(modalidade.id) === String(modalidadeId)) || null
}

function isNumericId(value) {
  return /^\d+$/.test(String(value || ''))
}

function startNewSpot() {
  if (!user) {
    showToast('Faz login para criar spots.', { type: 'warning' })
    return
  }

  spotEditingId = null
  ui.spotForm.reset()
  ui.spotCategoria.disabled = true
  ui.spotCategoria.innerHTML = '<option value="">Selecionar categoria</option>'
  updateSpotSeasonVisibility(true)
  setSpotLocationStatus('Pesquisa uma morada, escreve latitude/longitude ou escolhe no mapa.')
  clearDraftSpotMarker()
  openSpotModal()
}

function openSpotModal() {
  ui.spotModal.hidden = false
  ui.spotModalTitle.textContent = spotEditingId ? 'Editar spot' : 'Novo spot'
}

function closeSpotModal() {
  ui.spotModal.hidden = true
  ui.spotForm.reset()
  ui.spotCategoria.disabled = true
  ui.spotCategoria.innerHTML = '<option value="">Selecionar categoria</option>'
  updateSpotSeasonVisibility(true)
  setSpotLocationStatus('')
  clearDraftSpotMarker()
  spotEditingId = null
}

function enableSpotMapPicking() {
  pickingLocation = true
  ui.spotModal.hidden = true
  showToast('Clica no mapa para definir a localização do spot.', { type: 'info' })
}

function openVideoModal(spot) {
  if (!spot) return

  activeVideoSpotId = spot.id
  ui.videoForm.reset()
  ui.videoModal.hidden = false
  ui.videoModalTitle.textContent = spot.nome || 'Spot selecionado'
  ui.videoModalCopy.textContent = `O vídeo vai ficar ligado ao spot ${spot.nome || 'selecionado'} e passa a aparecer na galeria pública de vídeos.`
  renderVideoAnalysis()
  renderVideoXpPreview()
}

function closeVideoModal() {
  ui.videoModal.hidden = true
  ui.videoForm.reset()
  activeVideoSpotId = null
}

async function openXpModal(spot) {
  if (!spot) return

  if (!user) {
    showToast('Faz login para submeter XP.', { type: 'warning' })
    return
  }

  activeXpSpotId = spot.id
  ui.xpForm.reset()
  ui.xpModal.hidden = false
  ui.xpModalTitle.textContent = spot.nome || 'Spot selecionado'
  ui.xpModalCopy.textContent = `A moderação vai validar a prova para ${spot.nome || 'este spot'} antes de atribuir XP.`

  currentManobras = await obterManobras({ modalidade_id: spot.modalidade_id })
  ui.xpManobra.innerHTML = [
    '<option value="">Selecionar manobra</option>',
    ...currentManobras.map((manobra) => `<option value="${manobra.id}">${escapeHtml(manobra.nome)} - +${Number(manobra.xp || 0)} XP</option>`)
  ].join('')
  renderXpSubmissionState()
}

function closeXpModal() {
  ui.xpModal.hidden = true
  ui.xpForm.reset()
  activeXpSpotId = null
  currentManobras = []
}

function renderXpSubmissionState() {
  const spot = currentSpots.find((item) => Number(item.id) === Number(activeXpSpotId))
  const tipo = ui.xpTipo?.value || 'spot'
  const manobraId = Number(ui.xpManobra?.value)
  const selectedManobra = currentManobras.find((item) => Number(item.id) === Number(manobraId))
  const spotDifficulty = formatSpotDifficulty(spot?.dificuldade)
  const xpPrevisto = tipo === 'manobra'
    ? Number(selectedManobra?.xp || 0)
    : Number(spotDifficulty.xp || 0)

  ui.xpManobraField.hidden = tipo !== 'manobra'
  ui.xpManobra.required = tipo === 'manobra'

  const label = tipo === 'manobra'
    ? selectedManobra?.nome || 'Escolhe uma manobra'
    : `Completar spot ${spotDifficulty.label.toLowerCase()}`

  ui.xpPreview.innerHTML = `
    <strong>XP previsto: +${xpPrevisto}</strong>
    <p>${escapeHtml(label)}. Depois de enviada, a prova aparece no painel de moderação.</p>
  `
}

async function editSpot(spotId) {
  const spot = currentSpots.find((item) => item.id === spotId)
  if (!spot) return

  spotEditingId = spot.id
  ui.spotNome.value = spot.nome || ''
  ui.spotDescricao.value = spot.descricao || ''
  ui.spotModalidade.value = String(spot.modalidade_id || '')
  ui.spotDificuldade.value = spot.dificuldade || 'facil'
  setSelectedSeasonMonths(spot.melhor_epoca_meses || [])
  if (ui.spotSeasonNotes) ui.spotSeasonNotes.value = spot.melhor_epoca_notas || ''
  updateSpotSeasonVisibility(false)
  setSpotCoordinates(spot.coordenadas_lat, spot.coordenadas_long, false)
  if (ui.spotLocationQuery) ui.spotLocationQuery.value = ''
  setSpotLocationStatus('Podes ajustar as coordenadas, pesquisar outro local ou escolher no mapa.')
  await loadCategorias(spot.modalidade_id, spot.categoria_id)
  openSpotModal()
}

async function deleteSpot(spotId) {
  const confirmed = await showConfirm({
    title: 'Apagar spot',
    message: 'Queres mesmo apagar este spot?',
    confirmText: 'Apagar',
    danger: true
  })

  if (!confirmed) return

  const deleted = await apagarSpot(spotId)
  if (!deleted) {
    showToast('Não foi possível apagar o spot.', { type: 'error' })
    return
  }

  showToast('Spot apagado com sucesso.', { type: 'success' })
  await loadSpots()
}

async function deleteSpotVideo(videoId) {
  const confirmed = await showConfirm({
    title: 'Apagar vídeo',
    message: 'Queres mesmo apagar este vídeo do spot?',
    confirmText: 'Apagar',
    danger: true
  })

  if (!confirmed) return

  const deleted = await apagarVideoSpot(videoId)
  if (!deleted) {
    showToast('Não foi possível apagar o vídeo.', { type: 'error' })
    return
  }

  showToast('Video apagado com sucesso.', { type: 'success' })
  await loadSpots()
}

function focusSpotOnMap(spotId) {
  const marker = markerBySpotId.get(spotId)
  const spot = currentSpots.find((item) => item.id === spotId)

  if (spot) {
    map.setView([Number(spot.coordenadas_lat), Number(spot.coordenadas_long)], 14)
  }

  marker?.openPopup()
}

function focusSpotFromQuery() {
  const url = new URL(window.location.href)
  const spotId = Number(url.searchParams.get('spot'))
  if (!Number.isFinite(spotId) || spotId <= 0) return

  const marker = markerBySpotId.get(spotId)
  const spot = currentSpots.find((item) => item.id === spotId)
  if (!marker || !spot) return

  map.setView([Number(spot.coordenadas_lat), Number(spot.coordenadas_long)], 14)
  marker.openPopup()
}

function fitMapToVisibleSpots() {
  const latLngs = currentSpots
    .map((spot) => {
      const lat = Number(spot.coordenadas_lat)
      const lng = Number(spot.coordenadas_long)
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
    })
    .filter(Boolean)

  if (!latLngs.length) {
    map.setView([39.5, -8.5], 7)
    return
  }

  map.fitBounds(latLngs, { padding: [32, 32], maxZoom: 14 })
}

function focusUserLocation() {
  if (!('geolocation' in navigator)) {
    showToast('Geolocalização indisponível neste browser.', { type: 'warning' })
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = Number(position.coords.latitude)
      const lng = Number(position.coords.longitude)
      map.setView([lat, lng], 14)

      if (userLocationMarker) {
        userLocationMarker.setLatLng([lat, lng])
      } else {
        userLocationMarker = L.marker([lat, lng]).addTo(map)
      }

      userLocationMarker.bindPopup('Esta é a tua localização atual.').openPopup()
    },
    () => {
      showToast('Não foi possível obter a tua localização.', { type: 'error' })
    },
    { enableHighAccuracy: true, timeout: 12000 }
  )
}

async function searchSpotLocation() {
  const query = ui.spotLocationQuery?.value.trim()

  if (!query) {
    setSpotLocationStatus('Escreve o nome do local, praia, skatepark ou morada.')
    return
  }

  ui.btnSearchSpotLocation.disabled = true
  setSpotLocationStatus('A pesquisar localização...')

  try {
    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      addressdetails: '1',
      q: query
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) throw new Error('Pesquisa indisponível')

    const results = await response.json()
    const result = results?.[0]

    if (!result) {
      setSpotLocationStatus('Não encontrei esse local. Experimenta escrever também a cidade ou o país.')
      return
    }

    setSpotCoordinates(result.lat, result.lon, true)
    setSpotLocationStatus(result.display_name || 'Localização encontrada.')
  } catch (error) {
    console.error('Erro ao pesquisar localização do spot:', error)
    setSpotLocationStatus('Não foi possível pesquisar agora. Podes escrever as coordenadas manualmente.')
  } finally {
    ui.btnSearchSpotLocation.disabled = false
  }
}

function setSpotCoordinates(latValue, lngValue, focusMap = false) {
  const lat = Number(latValue)
  const lng = Number(lngValue)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

  ui.spotLat.value = String(roundCoordinate(lat))
  ui.spotLng.value = String(roundCoordinate(lng))
  updateDraftSpotMarker(lat, lng, focusMap)
}

function syncDraftSpotMarkerFromInputs() {
  const lat = Number(ui.spotLat?.value)
  const lng = Number(ui.spotLng?.value)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    clearDraftSpotMarker()
    return
  }

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    setSpotLocationStatus('Latitude deve estar entre -90 e 90; longitude entre -180 e 180.')
    clearDraftSpotMarker()
    return
  }

  setSpotLocationStatus('Coordenadas prontas para guardar.')
  updateDraftSpotMarker(lat, lng, false)
}

function updateDraftSpotMarker(lat, lng, focusMap = false) {
  if (!map || !isValidLatitude(lat) || !isValidLongitude(lng)) return

  if (draftSpotMarker) {
    draftSpotMarker.setLatLng([lat, lng])
  } else {
    draftSpotMarker = L.marker([lat, lng], {
      opacity: 0.85
    }).addTo(map)
  }

  draftSpotMarker.bindPopup('Localização escolhida para o novo spot.')

  if (focusMap) {
    map.setView([lat, lng], 14)
    draftSpotMarker.openPopup()
  }
}

function clearDraftSpotMarker() {
  if (!draftSpotMarker || !map) return
  map.removeLayer(draftSpotMarker)
  draftSpotMarker = null
}

function setSpotLocationStatus(message = '') {
  if (!ui.spotLocationStatus) return
  ui.spotLocationStatus.textContent = message
}

function roundCoordinate(value) {
  return Math.round(Number(value) * 1000000) / 1000000
}

function isValidLatitude(value) {
  return Number.isFinite(Number(value)) && Number(value) >= -90 && Number(value) <= 90
}

function isValidLongitude(value) {
  return Number.isFinite(Number(value)) && Number(value) >= -180 && Number(value) <= 180
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getVídeosForSpot(spotId) {
  return currentVideos.filter((video) => Number(video.spot_id) === Number(spotId))
}

function buildSpotPreviewUrl(spot) {
  const modalidade = String(spot?.modalidades?.nome || '').trim().toLowerCase()
  const previews = {
    surf: 'assets/images/boardsports-mix.jpg',
    skate: 'assets/images/cover-skate.png',
    skimboard: 'assets/images/skim.jpg',
    snowboard: 'assets/images/snowboard.jpg',
    sandboard: 'assets/images/boardsports-mix.jpg'
  }

  return previews[modalidade] || 'assets/images/boardsports-mix.jpg'
}

function buildDirectionsUrl(spot) {
  const lat = Number(spot.coordenadas_lat)
  const lng = Number(spot.coordenadas_long)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'https://www.google.com/maps'
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function formatSpotDifficulty(value = '') {
  const difficulties = {
    facil: { value: 'facil', label: 'Fácil', xp: 50 },
    media: { value: 'media', label: 'Média', xp: 120 },
    dificil: { value: 'dificil', label: 'Difícil', xp: 250 }
  }

  return difficulties[String(value || '').trim().toLowerCase()] || difficulties.facil
}

function normalizeSearch(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function debounce(callback, delay = 160) {
  let timeoutId = null
  return (...args) => {
    window.clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => callback(...args), delay)
  }
}

window.focusSpotOnMap = focusSpotOnMap
window.openVideoPublishModal = (spotId) => {
  if (!user) {
    showToast('Faz login para publicar vídeos num spot.', { type: 'warning' })
    return
  }
  const spot = currentSpots.find((item) => item.id === spotId)
  if (!spot) return
  openVideoModal(spot)
}
window.openXpSubmissionModal = (spotId) => {
  const spot = currentSpots.find((item) => item.id === spotId)
  if (!spot) return
  openXpModal(spot)
}
window.editSpot = editSpot
window.deleteSpot = deleteSpot
window.deleteSpotVideo = deleteSpotVideo

document.addEventListener('DOMContentLoaded', initMapPage)






