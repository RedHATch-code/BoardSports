import {
  obterGaleriaVideosSpots,
  obterLeaderboardXp,
  obterProdutos,
  obterResumoXp,
  obterSpots
} from './db_utils.js'

const sportImages = {
  skate: 'assets/images/cover-skate.png',
  surf: 'assets/images/surfingboardsports.jpg',
  skimboard: 'assets/images/skim.jpg',
  snowboard: 'assets/images/snowboard.jpg',
  sandboard: 'assets/images/sandboard.jpg'
}

function initLandingPage() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setupCinematicReel(prefersReducedMotion)
  setupHoverDepth(prefersReducedMotion)
  setupGsapAnimations(prefersReducedMotion)
  hydrateHomepageData()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandingPage)
} else {
  initLandingPage()
}

function setupCinematicReel(prefersReducedMotion) {
  const reel = document.querySelector('[data-cinematic-reel]')
  const frames = reel ? Array.from(reel.querySelectorAll('.hero-reel__frame')) : []
  let activeFrame = 0

  function showFrame(index) {
    if (!frames.length) return
    activeFrame = (index + frames.length) % frames.length
    frames.forEach((frame, frameIndex) => {
      frame.classList.toggle('is-active', frameIndex === activeFrame)
    })
  }

  if (!prefersReducedMotion && frames.length > 1) {
    window.setInterval(() => showFrame(activeFrame + 1), 3600)
  }

  showFrame(0)
}

function setupHoverDepth(prefersReducedMotion) {
  const cards = Array.from(document.querySelectorAll('.sport-card, .story-tile, .rank-board, .shop-window, .action-card, .proof-panel, .guide-card'))
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (prefersReducedMotion) return
      const rect = card.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      card.style.transform = `perspective(900px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-4px)`
    })

    card.addEventListener('pointerleave', () => {
      card.style.transform = ''
    })
  })
}

function setupGsapAnimations(prefersReducedMotion) {
  if (!window.gsap || prefersReducedMotion) return

  const gsap = window.gsap
  const ScrollTrigger = window.ScrollTrigger
  if (ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger)
  }

  gsap.from('.hero-reel__copy > *', {
    y: 34,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.09,
    delay: 0.18
  })

  gsap.utils.toArray('.daily-guide, .platform-proof, .section-heading, .sport-card, .split-section, .community-feed, .rank-board, .shop-window, .events-section, .action-card').forEach((element) => {
    gsap.from(element, {
      scrollTrigger: {
        trigger: element,
        start: 'top 86%',
        once: true
      },
      y: 54,
      duration: 0.9,
      ease: 'power3.out'
    })
  })

  gsap.to('.hero-reel__media', {
    scrollTrigger: {
      trigger: '.hero-reel',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    },
    yPercent: 18,
    scale: 1.08,
    ease: 'none'
  })
}

async function hydrateHomepageData() {
  try {
    const [spots, riders, produtos] = await Promise.all([
      obterSpots(),
      obterLeaderboardXp('global'),
      obterProdutos({ minimo_stock: true })
    ])

    const videos = spots.length
      ? await obterGaleriaVideosSpots({ spot_ids: spots.map((spot) => spot.id) })
      : await obterGaleriaVideosSpots()

    renderSportCounts(spots)
    renderMapSummary({ spots, videos, riders })
    renderProofPanels({ spots, videos, riders })
    renderMapSpotCards(spots)
    initHomeMapPreview(spots)
    renderCommunityFeed({ spots, videos })
    renderRanking(riders)
    renderProduct(produtos)
  } catch (error) {
    console.error('Erro ao carregar dados reais da homepage:', error)
    renderDatabaseFallback()
    initHomeMapPreview([])
  }
}

function renderSportCounts(spots = []) {
  const cards = document.querySelectorAll('[data-sport-card]')
  cards.forEach((card) => {
    const sportName = normalizeSport(card.dataset.sportName)
    const count = spots.filter((spot) => normalizeSport(spot.modalidades?.nome) === sportName).length
    const target = card.querySelector('[data-sport-count]')
    if (target) {
      target.textContent = `${count} ${count === 1 ? 'spot' : 'spots'} na base de dados`
    }
  })
}

function renderMapSummary({ spots = [], videos = [], riders = [] }) {
  const spotCount = document.querySelector('[data-home-spot-count]')
  const summary = document.querySelector('[data-home-map-summary]')
  if (spotCount) {
    spotCount.textContent = `${spots.length} ${spots.length === 1 ? 'spot ativo' : 'spots ativos'}`
  }
  if (summary) {
    summary.textContent = `${videos.length} ${videos.length === 1 ? 'vídeo' : 'vídeos'} ligados aos spots / ${riders.length} riders no ranking XP`
  }
}

function renderProofPanels({ spots = [], videos = [], riders = [] }) {
  const top = riders[0]
  const summary = top ? obterResumoXp(top) : null
  const spotCount = document.querySelector('[data-proof-spot-count]')
  const spotList = document.querySelector('[data-home-spots-list]')
  const riderRank = document.querySelector('[data-proof-rider-rank]')
  const riderInitials = document.querySelector('[data-proof-rider-initials]')
  const riderName = document.querySelector('[data-proof-rider-name]')
  const riderLevel = document.querySelector('[data-proof-rider-level]')
  const riderXp = document.querySelector('[data-proof-rider-xp]')
  const videoCount = document.querySelector('[data-proof-video-count]')
  const xpStatus = document.querySelector('[data-proof-xp-status]')
  const xpMeter = document.querySelector('[data-proof-xp-meter]')
  const xpCopy = document.querySelector('[data-proof-xp-copy]')

  if (spotCount) {
    spotCount.textContent = `${spots.length} spots`
  }

  if (spotList) {
    if (!spots.length) {
      spotList.innerHTML = '<p>Ainda não existem spots públicos na base de dados.</p>'
    } else {
      spotList.innerHTML = spots.slice(0, 3).map((spot) => `
        <article>
          <strong>${escapeHtml(spot.nome || 'Spot BoardSports')}</strong>
          <span>${escapeHtml(spot.modalidades?.nome || 'Modalidade')} / ${escapeHtml(spot.categorias?.nome || 'Geral')}</span>
        </article>
      `).join('')
    }
  }

  if (riderRank) riderRank.textContent = top ? '#01' : '#--'
  if (riderInitials) riderInitials.textContent = getInitials(top?.nome || top?.email || 'BS')
  if (riderName) riderName.textContent = top?.nome || top?.email || 'Sem rider XP'
  if (riderLevel) riderLevel.textContent = summary ? `Nível ${summary.nivel_xp} / ${summary.nivel_nome}` : 'Sem nível XP'
  if (riderXp) riderXp.textContent = `${formatNumber(top?.xp_ranking ?? top?.xp_total ?? 0)} XP`
  if (videoCount) videoCount.textContent = `${videos.length} ${videos.length === 1 ? 'vídeo' : 'vídeos'}`
  if (xpStatus) xpStatus.textContent = summary ? `${summary.progresso_percentagem}% até ao próximo nível` : 'À espera de provas'
  if (xpMeter) xpMeter.style.width = `${summary?.progresso_percentagem || 0}%`
  if (xpCopy) {
    xpCopy.textContent = summary
      ? `${top.nome || top.email || 'O rider líder'} precisa de ${summary.xp_para_proximo} XP para o próximo nível.`
      : 'As provas submetidas no mapa alimentam o ranking da comunidade.'
  }
}

function renderMapSpotCards(spots = []) {
  const target = document.querySelector('[data-home-map-spots]')
  if (!target) return

  if (!spots.length) {
    target.innerHTML = '<article><strong>Sem spots</strong><span>Cria o primeiro spot no mapa.</span></article>'
    return
  }

  target.innerHTML = spots.slice(0, 3).map((spot) => `
    <article>
      <strong>${escapeHtml(spot.nome || 'Spot BoardSports')}</strong>
      <span>${escapeHtml(spot.modalidades?.nome || 'Spot')} / ${formatCoordinate(spot.coordenadas_lat)}, ${formatCoordinate(spot.coordenadas_long)}</span>
    </article>
  `).join('')
}

function initHomeMapPreview(spots = []) {
  const target = document.getElementById('home-map-preview')
  if (!target || !window.L || target.dataset.ready === 'true') return

  const validSpots = spots
    .map((spot) => ({
      ...spot,
      lat: Number(spot.coordenadas_lat),
      lng: Number(spot.coordenadas_long)
    }))
    .filter((spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng))

  const map = window.L.map(target, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false
  }).setView([39.5, -8.5], 6)

  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map)

  const markerIcon = window.L.divIcon({
    className: '',
    html: '<span class="home-map-marker"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  })

  const bounds = []
  validSpots.forEach((spot) => {
    window.L.marker([spot.lat, spot.lng], { icon: markerIcon })
      .bindTooltip(spot.nome || 'Spot BoardSports', {
        permanent: false,
        direction: 'top',
        opacity: 0.92
      })
      .addTo(map)
    bounds.push([spot.lat, spot.lng])
  })

  if (bounds.length === 1) {
    map.setView(bounds[0], 11)
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [58, 58], maxZoom: 11 })
  }

  window.setTimeout(() => map.invalidateSize(), 120)
  target.dataset.ready = 'true'
}

function renderCommunityFeed({ spots = [], videos = [] }) {
  const stories = Array.from(document.querySelectorAll('[data-home-story]'))
  const activity = buildActivityItems(spots, videos)

  stories.forEach((story, index) => {
    const item = activity[index]
    const meta = story.querySelector('[data-story-meta]')
    const title = story.querySelector('[data-story-title]')
    if (!item) {
      if (meta) meta.textContent = 'Sem atividade recente'
      if (title) title.textContent = 'A base de dados ainda não tem publicações suficientes.'
      return
    }

    story.style.setProperty('--tile-image', `url('${item.image}')`)
    if (meta) meta.textContent = item.meta
    if (title) title.textContent = item.title
  })
}

function buildActivityItems(spots = [], videos = []) {
  const spotById = new Map(spots.map((spot) => [spot.id, spot]))
  const videoItems = videos.map((video) => {
    const spot = spotById.get(video.spot_id)
    const sport = spot?.modalidades?.nome || 'Vídeo'
    return {
      image: imageForSport(sport),
      meta: `${sport} / publicação recente`,
      title: video.legenda || spot?.nome || 'Novo vídeo publicado na comunidade.',
      date: video.data_criacao
    }
  })

  const spotItems = spots.map((spot) => ({
    image: imageForSport(spot.modalidades?.nome),
    meta: `${spot.modalidades?.nome || 'Spot'} / publicação recente`,
    title: spot.nome || 'Novo spot registado.',
    date: spot.data_criacao
  }))

  return [...videoItems, ...spotItems]
    .sort((first, second) => new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime())
}

function renderRanking(riders = []) {
  const summary = document.querySelector('[data-home-ranking-summary]')
  const list = document.querySelector('[data-home-ranking]')
  const meter = document.querySelector('[data-home-rank-meter]')
  const top = riders[0]

  if (summary) {
    summary.textContent = riders.length ? `${riders.length} riders ativos` : 'Sem XP registado'
  }

  if (!list) return

  if (!riders.length) {
    list.innerHTML = '<li><span>--</span><strong>Sem dados XP na base</strong><em>0 XP</em></li>'
    if (meter) meter.style.width = '0%'
    return
  }

  list.innerHTML = riders.slice(0, 3).map((rider, index) => {
    const xp = Number(rider.xp_ranking ?? rider.periodo_xp ?? rider.xp_total ?? 0)
    const label = rider.nome || rider.email || 'Rider BoardSports'
    return `<li><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(label)}</strong><em>${formatNumber(xp)} XP</em></li>`
  }).join('')

  if (meter) {
    meter.style.width = `${obterResumoXp(top).progresso_percentagem}%`
  }
}

function renderProduct(produtos = []) {
  const title = document.querySelector('[data-home-product-title]')
  const copy = document.querySelector('[data-home-product-copy]')
  const image = document.querySelector('[data-home-product-image]')
  const product = produtos[0]

  if (!product) {
    if (title) title.textContent = 'Sem produtos ativos na base de dados.'
    if (copy) copy.textContent = 'Quando houver produtos ativos, esta montra passa a mostrar o drop mais recente automaticamente.'
    return
  }

  const price = Number(product.preco || 0)
  if (title) title.textContent = product.nome || 'Produto BoardSports'
  if (copy) {
    copy.textContent = `${product.modalidade_nome || 'BoardSports'} / ${product.empresa_nome || 'Empresa'}${price ? ` / ${formatCurrency(price)}` : ''}`
  }
  if (image && product.imagem) {
    image.src = product.imagem
    image.alt = product.nome || 'Produto BoardSports'
  }
}

function renderDatabaseFallback() {
  const spotCount = document.querySelector('[data-home-spot-count]')
  const summary = document.querySelector('[data-home-map-summary]')
  if (spotCount) spotCount.textContent = 'Dados indisponíveis'
  if (summary) summary.textContent = 'Não foi possível carregar a base de dados neste momento.'
}

function normalizeSport(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function imageForSport(value = '') {
  return sportImages[normalizeSport(value)] || 'assets/images/boardsports-mix.jpg'
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat('pt-PT').format(Number(value || 0))
}

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value || 0))
}

function formatCoordinate(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '--'
}

function getInitials(label = '') {
  return String(label || 'BS')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BS'
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
