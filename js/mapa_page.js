import { obterUsuarioAtual } from './auth_utils.js'
import {
  analisarVideoUrl,
  apagarVideoSpot,
  apagarSpot,
  atualizarSpot,
  criarSubmissaoXp,
  criarSpot,
  obterConquistasDiarias,
  obterCategoriasPorModalidade,
  obterGaleriaVideosSpots,
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
let currentSpots = []
let currentVideos = []
let spotEditingId = null
let pickingLocation = false
let activeVideoSpotId = null
let activeXpSpotId = null
let userLocationMarker = null
let draftSpotMarker = null
let currentManobras = []

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

const ui = {
  totalSpots: document.getElementById('map-total-spots'),
  totalVideos: document.getElementById('map-total-videos'),
  filter: document.getElementById('filter-modalidade'),
  categoryFilter: document.getElementById('filter-categoria'),
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
  bindEvents()
  user = await obterUsuarioAtual()
  await loadModalidadeOptions()
  await loadSpots()
  await loadDailyAchievements()
}

function initMap() {
  map = L.map('map').setView([39.5, -8.5], 7)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
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

  ui.btnAddSpot?.addEventListener('click', () => {
    startNewSpot()
  })

  ui.btnMyLocation?.addEventListener('click', focusUserLocation)

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
  ui.xpTipo?.addEventListener('change', renderXpSubmissionState)
  ui.xpManobra?.addEventListener('change', renderXpSubmissionState)
  ui.dailyAchievements?.addEventListener('click', handleDailyAchievementClick)
  document.addEventListener('click', handleSpotActionClick)
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
  })

  window.addEventListener('click', (event) => {
    if (event.target === ui.spotModal) closeSpotModal()
    if (event.target === ui.videoModal) closeVideoModal()
    if (event.target === ui.xpModal) closeXpModal()
  })
}

async function loadSpots() {
  currentSpots = await obterSpots({
    modalidade_id: currentModalidade,
    categoria_id: isNumericId(currentCategoria) ? currentCategoria : 'all'
  })
  currentVideos = currentSpots.length
    ? await obterGaleriaVideosSpots({ spot_ids: currentSpots.map((spot) => spot.id) })
    : []

  rebuildVideoCounts()
  renderSummary()
  renderMarkers()
  renderSpotCards()
  focusSpotFromQuery()
}

async function loadDailyAchievements() {
  if (!ui.dailyAchievements) return

  if (!user) {
    ui.dailyAchievements.innerHTML = '<article class="map-empty-card"><p>Faz login para reclamar conquistas diarias de XP.</p></article>'
    return
  }

  const achievements = await obterConquistasDiarias(user.id)
  renderDailyAchievements(achievements)
}

function renderDailyAchievements(achievements = []) {
  if (!achievements.length) {
    ui.dailyAchievements.innerHTML = '<article class="map-empty-card"><p>Nao foi possivel carregar as conquistas diarias.</p></article>'
    return
  }

  ui.dailyAchievements.innerHTML = achievements.map((achievement) => {
    const buttonLabel = achievement.reclamada
      ? 'Reclamada'
      : achievement.concluida
        ? `Reclamar +${achievement.xp} XP`
        : 'Por concluir'

    return `
      <article class="daily-achievement-card ${achievement.reclamada ? 'is-claimed' : ''}">
        <div>
          <span class="daily-achievement-xp">+${Number(achievement.xp || 0)} XP</span>
          <h3>${escapeHtml(achievement.titulo)}</h3>
          <p>${escapeHtml(achievement.descricao)}</p>
          <small>${achievement.concluida ? 'Objetivo concluido hoje' : 'Ainda falta completar hoje'}</small>
        </div>
        <button
          type="button"
          class="map-secondary-button"
          data-daily-achievement="${escapeHtml(achievement.codigo)}"
          ${achievement.concluida && !achievement.reclamada ? '' : 'disabled'}
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
    showToast(result?.erro || 'Nao foi possivel reclamar a conquista.', { type: 'error' })
  }

  user = await obterUsuarioAtual()
  await loadDailyAchievements()
}

function handleSpotActionClick(event) {
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

  return `
    <div style="min-width:220px;color:#f3f4f6;">
      <strong style="display:block;font-size:1rem;margin-bottom:8px;">${escapeHtml(spot.nome)}</strong>
      <p style="margin:0 0 6px;color:#c7c9d1;">${escapeHtml(spot.modalidades?.nome || 'Spot')} · ${escapeHtml(spot.categorias?.nome || 'Geral')}</p>
      <p style="margin:0 0 6px;color:#ffd6a3;">Dificuldade: ${escapeHtml(dificuldade.label)}</p>
      <p style="margin:0 0 10px;color:#9ca3af;">${escapeHtml(spot.descricao || 'Sem descricao adicional.')}</p>
      <p style="margin:0 0 12px;color:#ffd6a3;">${videoCount} ${videoCount === 1 ? 'video ligado' : 'videos ligados'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" data-spot-action="focus" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#f3f4f6;cursor:pointer;">Focar</button>
        <button type="button" data-spot-action="video" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:0;background:linear-gradient(135deg,#f5d7b5 0%,#d66d24 100%);color:#141414;font-weight:700;cursor:pointer;">Publicar video</button>
        <button type="button" data-spot-action="xp" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:1px solid rgba(47,158,163,0.24);background:rgba(47,158,163,0.14);color:#b8f1f2;font-weight:700;cursor:pointer;">Submeter XP</button>
        ${canEdit ? `<button type="button" data-spot-action="edit" data-spot-id="${spot.id}" style="min-height:36px;padding:0 12px;border-radius:999px;border:0;background:#2f343d;color:#f3f4f6;cursor:pointer;">Editar</button>` : ''}
      </div>
    </div>
  `
}

function renderSpotCards() {
  if (!currentSpots.length) {
    ui.spotsContainer.innerHTML = '<article class="map-empty-card"><p>Nao existem spots com este filtro.</p></article>'
    return
  }

  ui.spotsContainer.innerHTML = currentSpots.map((spot) => {
    const videoCount = videoCountBySpotId.get(spot.id) || 0
    const canEdit = user && spot.criador_id === user.id
    const dificuldade = formatSpotDifficulty(spot.dificuldade)
    const spotVideos = getVideosForSpot(spot.id)
    const previewUrl = buildSpotPreviewUrl(spot)
    const directionsUrl = buildDirectionsUrl(spot)

    return `
      <article class="spot-card">
        <div class="spot-preview">
          <img src="${escapeHtml(previewUrl)}" alt="Preview de localizacao para ${escapeHtml(spot.nome)}" width="640" height="360" loading="lazy" decoding="async">
          <div class="spot-preview-overlay">
            <span>${Number(spot.coordenadas_lat).toFixed(3)}, ${Number(spot.coordenadas_long).toFixed(3)}</span>
          </div>
        </div>

        <div class="spot-card-top">
          <div>
            <span class="spot-card-tag">${escapeHtml(spot.modalidades?.nome || 'Spot')}</span>
            <span class="spot-difficulty-tag" data-difficulty="${escapeHtml(dificuldade.value)}">${escapeHtml(dificuldade.label)} · +${dificuldade.xp} XP</span>
          </div>
          <small>${videoCount} ${videoCount === 1 ? 'video' : 'videos'}</small>
        </div>

        <div>
          <h3>${escapeHtml(spot.nome)}</h3>
        </div>

        <p>${escapeHtml(spot.descricao || 'Sem descricao adicional para este spot.')}</p>

        <div class="spot-card-meta">
          <span>Categoria: ${escapeHtml(spot.categorias?.nome || 'Geral')}</span>
          <span>Autor: ${escapeHtml(spot.profiles?.nome || spot.profiles?.email || 'Utilizador')}</span>
          <span>Coordenadas: ${Number(spot.coordenadas_lat).toFixed(3)}, ${Number(spot.coordenadas_long).toFixed(3)}</span>
        </div>

        ${renderSpotVideoList(spotVideos)}

        <div class="spot-card-actions">
          <button type="button" class="map-focus-button" data-spot-action="focus" data-spot-id="${spot.id}">Abrir no mapa</button>
          <a class="map-directions-button" href="${escapeHtml(directionsUrl)}" target="_blank" rel="noreferrer">Direcoes</a>
          <button type="button" class="map-video-button" data-spot-action="video" data-spot-id="${spot.id}">Publicar video</button>
          <button type="button" class="map-xp-button" data-spot-action="xp" data-spot-id="${spot.id}">Submeter XP</button>
          ${canEdit ? `<button type="button" class="map-edit-button" data-spot-action="edit" data-spot-id="${spot.id}">Editar</button>` : ''}
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
      <strong>Videos deste spot</strong>
      ${videos.slice(0, 3).map((video) => {
        const canDelete = user && (video.autor_id === user.id || user.perfil?.is_admin)
        const analysis = video.analise_resultado || analisarVideoUrl(video.video_url)

        return `
          <article class="spot-video-item">
            <div>
              <span>${escapeHtml(video.legenda || 'Video publicado')}</span>
              <small>${escapeHtml(analysis.formato === 'short' ? 'Curto vertical' : 'Longo horizontal')} · ${escapeHtml(video.plataforma || analysis.plataforma || 'link')}</small>
            </div>
            <div class="spot-video-actions">
              <a href="${escapeHtml(video.video_url)}" target="_blank" rel="noreferrer">Ver</a>
              ${canDelete ? `<button type="button" data-spot-action="delete-video" data-video-id="${escapeHtml(video.id)}">Apagar</button>` : ''}
            </div>
          </article>
        `
      }).join('')}
      ${videos.length > 3 ? `<small>+${videos.length - 3} videos adicionais na galeria.</small>` : ''}
    </div>
  `
}

function handleMapClick(event) {
  if (!pickingLocation) return

  setSpotCoordinates(event.latlng.lat, event.latlng.lng, true)
  openSpotModal()
  pickingLocation = false
  setSpotLocationStatus('Localizacao definida a partir do mapa.')
}

async function submitSpotForm(event) {
  event.preventDefault()

  user = await obterUsuarioAtual()
  if (!user) {
    showToast('Faz login para criar ou editar spots.', { type: 'warning' })
    return
  }

  const payload = {
    nome: ui.spotNome.value.trim(),
    descricao: ui.spotDescricao.value.trim(),
    modalidade_id: Number(ui.spotModalidade.value),
    categoria_id: isNumericId(ui.spotCategoria.value) ? Number(ui.spotCategoria.value) : null,
    dificuldade: ui.spotDificuldade.value || 'facil',
    coordenadas_lat: Number(ui.spotLat.value),
    coordenadas_long: Number(ui.spotLng.value),
    criador_id: user.id
  }

  if (!payload.nome || !payload.modalidade_id || !Number.isFinite(payload.coordenadas_lat) || !Number.isFinite(payload.coordenadas_long)) {
    showToast('Preenche os campos obrigatorios do spot.', { type: 'warning' })
    return
  }

  if (!isValidLatitude(payload.coordenadas_lat) || !isValidLongitude(payload.coordenadas_long)) {
    showToast('As coordenadas do spot nao sao validas.', { type: 'warning' })
    return
  }

  if (spotEditingId) {
    const updated = await atualizarSpot(spotEditingId, payload)
    if (!updated) {
      showToast('Nao foi possivel atualizar o spot.', { type: 'error' })
      return
    }

    showToast('Spot atualizado com sucesso.', { type: 'success' })
  } else {
    const created = await criarSpot(payload)
    if (!created) {
      showToast('Nao foi possivel criar o spot.', { type: 'error' })
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
    showToast('Faz login para publicar videos num spot.', { type: 'warning' })
    return
  }

  const videoUrl = ui.videoUrl.value.trim()
  if (!videoUrl) {
    showToast('Indica o URL do video.', { type: 'warning' })
    return
  }

  const resultado = await publicarVideoSpot({
    spot_id: activeVideoSpotId,
    autor_id: user.id,
    video_url: videoUrl,
    legenda: ui.videoLegenda.value.trim()
  })

  if (!resultado?.sucesso) {
    showToast(resultado?.erro || 'Nao foi possivel publicar o video.', { type: 'error', duration: 4800 })
    return
  }

  showToast('Video publicado com sucesso.', { type: 'success' })
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
    showToast('Spot invalido para submissao XP.', { type: 'error' })
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

  const result = await criarSubmissaoXp({
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
    showToast(result?.erro || 'Nao foi possivel criar a submissao XP.', { type: 'error', duration: 5200 })
    return
  }

  showToast('Submissao XP enviada para moderacao.', { type: 'success' })
  closeXpModal()
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
    <strong>Analisador de video</strong>
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
  setSpotLocationStatus('')
  clearDraftSpotMarker()
  spotEditingId = null
}

function enableSpotMapPicking() {
  pickingLocation = true
  ui.spotModal.hidden = true
  showToast('Clica no mapa para definir a localizacao do spot.', { type: 'info' })
}

function openVideoModal(spot) {
  if (!spot) return

  activeVideoSpotId = spot.id
  ui.videoForm.reset()
  ui.videoModal.hidden = false
  ui.videoModalTitle.textContent = spot.nome || 'Spot selecionado'
  ui.videoModalCopy.textContent = `O video vai ficar ligado ao spot ${spot.nome || 'selecionado'} e passa a aparecer na galeria publica de videos.`
  renderVideoAnalysis()
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
  ui.xpModalCopy.textContent = `A moderacao vai validar a prova para ${spot.nome || 'este spot'} antes de atribuir XP.`

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
    <p>${escapeHtml(label)}. Depois de enviada, a prova aparece no painel de moderacao.</p>
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
    showToast('Nao foi possivel apagar o spot.', { type: 'error' })
    return
  }

  showToast('Spot apagado com sucesso.', { type: 'success' })
  await loadSpots()
}

async function deleteSpotVideo(videoId) {
  const confirmed = await showConfirm({
    title: 'Apagar video',
    message: 'Queres mesmo apagar este video do spot?',
    confirmText: 'Apagar',
    danger: true
  })

  if (!confirmed) return

  const deleted = await apagarVideoSpot(videoId)
  if (!deleted) {
    showToast('Nao foi possivel apagar o video.', { type: 'error' })
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
    showToast('Geolocalizacao indisponivel neste browser.', { type: 'warning' })
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

      userLocationMarker.bindPopup('Esta e a tua localizacao atual.').openPopup()
    },
    () => {
      showToast('Nao foi possivel obter a tua localizacao.', { type: 'error' })
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
  setSpotLocationStatus('A pesquisar localizacao...')

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

    if (!response.ok) throw new Error('Pesquisa indisponivel')

    const results = await response.json()
    const result = results?.[0]

    if (!result) {
      setSpotLocationStatus('Nao encontrei esse local. Experimenta escrever tambem a cidade ou pais.')
      return
    }

    setSpotCoordinates(result.lat, result.lon, true)
    setSpotLocationStatus(result.display_name || 'Localizacao encontrada.')
  } catch (error) {
    console.error('Erro ao pesquisar localizacao do spot:', error)
    setSpotLocationStatus('Nao foi possivel pesquisar agora. Podes escrever as coordenadas manualmente.')
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

  draftSpotMarker.bindPopup('Localizacao escolhida para o novo spot.')

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

function getVideosForSpot(spotId) {
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
    facil: { value: 'facil', label: 'Facil', xp: 50 },
    media: { value: 'media', label: 'Media', xp: 120 },
    dificil: { value: 'dificil', label: 'Dificil', xp: 250 }
  }

  return difficulties[String(value || '').trim().toLowerCase()] || difficulties.facil
}

window.focusSpotOnMap = focusSpotOnMap
window.openVideoPublishModal = (spotId) => {
  if (!user) {
    showToast('Faz login para publicar videos num spot.', { type: 'warning' })
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
