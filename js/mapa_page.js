import { obterUsuarioAtual } from './auth_utils.js'
import {
  apagarSpot,
  atualizarSpot,
  criarSpot,
  obterCategoriasPorModalidade,
  obterGaleriaVideosSpots,
  obterModalidades,
  obterSpots,
  publicarVideoSpot
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
let userLocationMarker = null

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
  spotModal: document.getElementById('modal-spot'),
  spotModalTitle: document.getElementById('spot-modal-title'),
  spotForm: document.getElementById('form-spot'),
  spotNome: document.getElementById('spot-nome'),
  spotDescricao: document.getElementById('spot-descricao'),
  spotModalidade: document.getElementById('spot-modalidade'),
  spotCategoria: document.getElementById('spot-categoria'),
  spotLat: document.getElementById('spot-lat'),
  spotLng: document.getElementById('spot-lng'),
  videoModal: document.getElementById('modal-video'),
  videoModalTitle: document.getElementById('video-modal-title'),
  videoModalCopy: document.getElementById('video-modal-spot-copy'),
  videoForm: document.getElementById('form-video'),
  videoUrl: document.getElementById('video-url'),
  videoLegenda: document.getElementById('video-legenda')
}

async function initMapPage() {
  initMap()
  bindEvents()
  user = await obterUsuarioAtual()
  await loadModalidadeOptions()
  await loadSpots()
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
    pickingLocation = true
    showToast('Clica num ponto do mapa para definir a localizacao do spot.', { type: 'info' })
  })

  ui.btnMyLocation?.addEventListener('click', focusUserLocation)

  ui.spotModal.querySelectorAll('[data-close-spot]').forEach((button) => {
    button.addEventListener('click', closeSpotModal)
  })

  ui.videoModal.querySelectorAll('[data-close-video]').forEach((button) => {
    button.addEventListener('click', closeVideoModal)
  })

  ui.spotForm?.addEventListener('submit', submitSpotForm)
  ui.videoForm?.addEventListener('submit', submitVideoForm)

  ui.spotModalidade?.addEventListener('change', async (event) => {
    const modalidadeId = event.target.value
    await loadCategorias(modalidadeId)
  })

  window.addEventListener('click', (event) => {
    if (event.target === ui.spotModal) closeSpotModal()
    if (event.target === ui.videoModal) closeVideoModal()
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

  return `
    <div style="min-width:220px;color:#f3f4f6;">
      <strong style="display:block;font-size:1rem;margin-bottom:8px;">${escapeHtml(spot.nome)}</strong>
      <p style="margin:0 0 6px;color:#c7c9d1;">${escapeHtml(spot.modalidades?.nome || 'Spot')} · ${escapeHtml(spot.categorias?.nome || 'Geral')}</p>
      <p style="margin:0 0 10px;color:#9ca3af;">${escapeHtml(spot.descricao || 'Sem descricao adicional.')}</p>
      <p style="margin:0 0 12px;color:#ffd6a3;">${videoCount} ${videoCount === 1 ? 'video ligado' : 'videos ligados'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" onclick="window.focusSpotOnMap(${spot.id})" style="min-height:36px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#f3f4f6;cursor:pointer;">Focar</button>
        <button type="button" onclick="window.openVideoPublishModal(${spot.id})" style="min-height:36px;padding:0 12px;border-radius:999px;border:0;background:linear-gradient(135deg,#f5d7b5 0%,#d66d24 100%);color:#141414;font-weight:700;cursor:pointer;">Publicar video</button>
        ${canEdit ? `<button type="button" onclick="window.editSpot(${spot.id})" style="min-height:36px;padding:0 12px;border-radius:999px;border:0;background:#2f343d;color:#f3f4f6;cursor:pointer;">Editar</button>` : ''}
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

    return `
      <article class="spot-card">
        <div class="spot-card-top">
          <div>
            <span class="spot-card-tag">${escapeHtml(spot.modalidades?.nome || 'Spot')}</span>
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

        <div class="spot-card-actions">
          <button type="button" class="map-focus-button" onclick="window.focusSpotOnMap(${spot.id})">Abrir no mapa</button>
          <button type="button" class="map-video-button" onclick="window.openVideoPublishModal(${spot.id})">Publicar video</button>
          ${canEdit ? `<button type="button" class="map-edit-button" onclick="window.editSpot(${spot.id})">Editar</button>` : ''}
          ${canEdit ? `<button type="button" class="map-delete-button" onclick="window.deleteSpot(${spot.id})">Apagar</button>` : ''}
        </div>
      </article>
    `
  }).join('')
}

function handleMapClick(event) {
  if (!pickingLocation) return

  ui.spotLat.value = String(event.latlng.lat)
  ui.spotLng.value = String(event.latlng.lng)
  openSpotModal()
  pickingLocation = false
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
    coordenadas_lat: Number(ui.spotLat.value),
    coordenadas_long: Number(ui.spotLng.value),
    criador_id: user.id
  }

  if (!payload.nome || !payload.modalidade_id || !Number.isFinite(payload.coordenadas_lat) || !Number.isFinite(payload.coordenadas_long)) {
    showToast('Preenche os campos obrigatorios do spot.', { type: 'warning' })
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

function openSpotModal() {
  ui.spotModal.hidden = false
  ui.spotModalTitle.textContent = spotEditingId ? 'Editar spot' : 'Novo spot'
}

function closeSpotModal() {
  ui.spotModal.hidden = true
  ui.spotForm.reset()
  ui.spotCategoria.disabled = true
  ui.spotCategoria.innerHTML = '<option value="">Selecionar categoria</option>'
  spotEditingId = null
}

function openVideoModal(spot) {
  if (!spot) return

  activeVideoSpotId = spot.id
  ui.videoForm.reset()
  ui.videoModal.hidden = false
  ui.videoModalTitle.textContent = spot.nome || 'Spot selecionado'
  ui.videoModalCopy.textContent = `O video vai ficar ligado ao spot ${spot.nome || 'selecionado'} e passa a aparecer na galeria publica de videos.`
}

function closeVideoModal() {
  ui.videoModal.hidden = true
  ui.videoForm.reset()
  activeVideoSpotId = null
}

async function editSpot(spotId) {
  const spot = currentSpots.find((item) => item.id === spotId)
  if (!spot) return

  spotEditingId = spot.id
  ui.spotNome.value = spot.nome || ''
  ui.spotDescricao.value = spot.descricao || ''
  ui.spotModalidade.value = String(spot.modalidade_id || '')
  ui.spotLat.value = String(spot.coordenadas_lat || '')
  ui.spotLng.value = String(spot.coordenadas_long || '')
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

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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
window.editSpot = editSpot
window.deleteSpot = deleteSpot

document.addEventListener('DOMContentLoaded', initMapPage)
