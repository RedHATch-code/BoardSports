import { obterUsuarioAtual } from './auth_utils.js'
import {
  alternarFavoritoSpot,
  criarComentario,
  criarDenuncia,
  enviarImagemSpot,
  obterComentarios,
  obterCondicoesSpot,
  obterEstatisticasSpot,
  obterFavoritos,
  obterGaleriaVídeosSpots,
  obterImagensSpot,
  obterRecomendacoesSpots,
  obterSpots
} from './db_utils.js'
import { showToast } from './ui_feedback.js'

const spotId = Number(new URLSearchParams(window.location.search).get('id'))
let user = null
let spot = null
let isFavorite = false
let videos = []

const ui = {
  hero: document.getElementById('spot-detail-hero'),
  favorite: document.getElementById('spot-favorite'),
  directions: document.getElementById('spot-directions'),
  report: document.getElementById('spot-report'),
  stats: document.getElementById('spot-stats'),
  conditions: document.getElementById('spot-conditions'),
  imageForm: document.getElementById('spot-image-form'),
  imageFile: document.getElementById('spot-image-file'),
  imageCaption: document.getElementById('spot-image-caption'),
  images: document.getElementById('spot-images'),
  videos: document.getElementById('spot-videos'),
  commentForm: document.getElementById('spot-comment-form'),
  commentText: document.getElementById('spot-comment-text'),
  comments: document.getElementById('spot-comments'),
  recommendations: document.getElementById('spot-recommendations')
}

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

function directionsUrl(item) {
  return `https://www.google.com/maps/dir/?api=1&destination=${Number(item.coordenadas_lat)},${Number(item.coordenadas_long)}`
}

function formatBestSeason(item) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const selected = (item.melhor_epoca_meses || [])
    .map((month) => months[Number(month) - 1])
    .filter(Boolean)
    .join(', ')
  return [selected, item.melhor_epoca_notas].filter(Boolean).join(' - ')
}

function renderHero() {
  const season = formatBestSeason(spot)
  ui.hero.innerHTML = `
    <div class="map-page-copy">
      <span class="map-page-kicker">${escapeHtml(spot.modalidades?.nome || 'Spot')}</span>
      <h1>${escapeHtml(spot.nome)}</h1>
      <p>${escapeHtml(spot.descricao || 'Sem descrição adicional.')}</p>
      <p>${escapeHtml([spot.categorias?.nome, season ? `Melhor altura: ${season}` : ''].filter(Boolean).join(' / '))}</p>
    </div>
  `
  ui.directions.href = directionsUrl(spot)
}

function renderStats(stats = {}) {
  const rows = [
    ['Vídeos', stats.videos || videos.length || 0],
    ['Comentários', stats.comentarios || 0],
    ['Favoritos', stats.favoritos || 0],
    ['Imagens', stats.imagens || 0]
  ]

  ui.stats.innerHTML = rows.map(([label, value]) => `
    <article class="map-stat-card">
      <strong>${Number(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join('')
}

function renderConditions(data) {
  const current = data?.weather?.current || {}
  const marine = data?.marine?.current || null
  const snowDepth = data?.weather?.daily?.snow_depth_max?.[0]
  const snowfall = data?.weather?.daily?.snowfall_sum?.[0]

  ui.conditions.innerHTML = `
    <strong>Condições externas</strong>
    <p>Fonte: Open-Meteo. Usa isto como previsão de apoio, não como garantia.</p>
    <div class="spot-video-item"><span>Temperatura</span><small>${current.temperature_2m ?? '-'} °C</small></div>
    <div class="spot-video-item"><span>Vento</span><small>${current.wind_speed_10m ?? '-'} km/h</small></div>
    ${marine ? `<div class="spot-video-item"><span>Ondulação</span><small>${marine.wave_height ?? '-'} m / ${marine.wave_period ?? '-'} s</small></div>` : ''}
    ${(snowDepth || snowfall) ? `<div class="spot-video-item"><span>Neve</span><small>${snowDepth ?? 0} m profundidade / ${snowfall ?? 0} cm prevista</small></div>` : ''}
  `
}

async function renderImages() {
  const images = await obterImagensSpot(spotId)
  if (!images.length) {
    ui.images.innerHTML = '<article class="map-empty-card"><p>Ainda não existem imagens neste spot.</p></article>'
    return
  }

  ui.images.innerHTML = images.map((image) => `
    <article class="spot-card">
      <div class="spot-preview"><img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.legenda || spot.nome)}" loading="lazy"></div>
      <p>${escapeHtml(image.legenda || 'Imagem do spot')}</p>
      <small>${escapeHtml(image.profiles?.nome || image.profiles?.email || 'Comunidade')}</small>
    </article>
  `).join('')
}

async function renderVideos() {
  videos = await obterGaleriaVídeosSpots({ spot_id: spotId })
  if (!videos.length) {
    ui.videos.innerHTML = '<article class="map-empty-card"><p>Ainda não existem vídeos neste spot.</p></article>'
    return
  }

  ui.videos.innerHTML = videos.map((video) => `
    <article class="spot-card" id="video-${escapeHtml(video.id)}">
      <span class="spot-card-tag">${escapeHtml(video.formato || 'video')}</span>
      <h3>${escapeHtml(video.legenda || 'Vídeo publicado')}</h3>
      <p>${escapeHtml(video.autor?.nome || video.autor?.email || 'Utilizador')}</p>
      <div class="spot-card-actions">
        <a class="map-primary-button" href="${escapeHtml(video.video_url)}" target="_blank" rel="noreferrer">Ver vídeo</a>
        <button type="button" class="map-secondary-button" data-report-video="${escapeHtml(video.id)}">Denunciar</button>
      </div>
      <form class="map-form" data-video-comment-form="${escapeHtml(video.id)}" ${user ? '' : 'hidden'}>
        <textarea rows="2" placeholder="Comentar este vídeo"></textarea>
        <button class="map-secondary-button" type="submit">Comentar vídeo</button>
      </form>
      <div class="moderation-list" data-video-comments="${escapeHtml(video.id)}"></div>
    </article>
  `).join('')

  await Promise.all(videos.map((video) => renderVideoComments(video.id)))
}

async function renderVideoComments(videoId) {
  const target = ui.videos.querySelector(`[data-video-comments="${CSS.escape(String(videoId))}"]`)
  if (!target) return
  const comments = await obterComentarios('video', videoId)
  target.innerHTML = comments.slice(0, 3).map(renderComment).join('')
}

function renderComment(comment) {
  return `
    <article class="moderation-card">
      <div class="moderation-card-top">
        <div>
          <h3>${escapeHtml(comment.profiles?.nome || comment.profiles?.email || 'Utilizador')}</h3>
          <p>${escapeHtml(comment.conteudo)}</p>
        </div>
        <span class="moderation-status-badge" data-status="aprovado">${formatDate(comment.data_criacao)}</span>
      </div>
    </article>
  `
}

async function renderSpotComments() {
  const comments = await obterComentarios('spot', spotId)
  ui.comments.innerHTML = comments.length
    ? comments.map(renderComment).join('')
    : '<article class="moderation-empty-card"><p>Ainda não existem comentários.</p></article>'
}

async function renderRecommendations() {
  const recommendations = await obterRecomendacoesSpots(spot, 4)
  ui.recommendations.innerHTML = recommendations.length
    ? recommendations.map((item) => `
      <article class="spot-card">
        <span class="spot-card-tag">${escapeHtml(item.modalidades?.nome || 'Spot')}</span>
        <h3>${escapeHtml(item.nome)}</h3>
        <p>${Number.isFinite(item.distancia_km) ? `${item.distancia_km.toFixed(1)} km de distância aproximada.` : escapeHtml(item.descricao || '')}</p>
        <div class="spot-card-actions"><a class="map-primary-button" href="/spot.html?id=${item.id}">Abrir</a></div>
      </article>
    `).join('')
    : '<article class="map-empty-card"><p>Sem recomendações disponíveis.</p></article>'
}

async function submitSpotComment(event) {
  event.preventDefault()
  if (!user) return
  const content = ui.commentText.value.trim()
  if (!content) return
  const created = await criarComentario({ entidade_tipo: 'spot', entidade_id: spotId, user_id: user.id, conteudo: content })
  if (!created) {
    showToast('Não foi possível comentar.', { type: 'error' })
    return
  }
  ui.commentText.value = ''
  await renderSpotComments()
}

async function submitImage(event) {
  event.preventDefault()
  if (!user) return
  const file = ui.imageFile.files?.[0]
  if (!file) {
    showToast('Escolhe uma imagem.', { type: 'warning' })
    return
  }
  const uploaded = await enviarImagemSpot({ spotId, userId: user.id, file, legenda: ui.imageCaption.value })
  if (!uploaded) {
    showToast('Não foi possível enviar a imagem.', { type: 'error' })
    return
  }
  ui.imageForm.reset()
  await renderImages()
}

async function onVideosClick(event) {
  const report = event.target.closest('[data-report-video]')
  if (report) await reportEntity('video', report.dataset.reportVideo)
}

async function onVideoComment(event) {
  const form = event.target.closest('[data-video-comment-form]')
  if (!form) return
  event.preventDefault()
  if (!user) return

  const videoId = form.dataset.videoCommentForm
  const text = form.querySelector('textarea').value.trim()
  if (!text) return
  const created = await criarComentario({ entidade_tipo: 'video', entidade_id: videoId, user_id: user.id, conteudo: text })
  if (!created) {
    showToast('Não foi possível comentar o vídeo.', { type: 'error' })
    return
  }
  form.reset()
  await renderVideoComments(videoId)
}

async function reportEntity(type, id) {
  if (!user) {
    showToast('Faz login para denunciar.', { type: 'warning' })
    return
  }
  const reason = window.prompt('Motivo da denúncia:')
  if (!reason?.trim()) return
  const created = await criarDenuncia({ entidade_tipo: type, entidade_id: id, denunciante_id: user.id, motivo: reason })
  showToast(created ? 'Denúncia enviada para moderação.' : 'Não foi possível enviar a denúncia.', { type: created ? 'success' : 'error' })
}

async function init() {
  if (!Number.isFinite(spotId) || spotId <= 0) {
    ui.hero.innerHTML = '<div class="map-page-copy"><h1>Spot inválido.</h1><p>Volta ao mapa e escolhe um spot.</p></div>'
    return
  }

  user = await obterUsuarioAtual()
  const spots = await obterSpots({ ids: [spotId] })
  spot = spots[0]
  if (!spot) {
    ui.hero.innerHTML = '<div class="map-page-copy"><h1>Spot não encontrado.</h1><p>Este spot pode ter sido removido.</p></div>'
    return
  }

  if (user) {
    ui.commentForm.hidden = false
    ui.imageForm.hidden = false
    isFavorite = (await obterFavoritos(user.id)).some((item) => Number(item.spot_id) === spotId)
    ui.favorite.textContent = isFavorite ? 'Remover favorito' : 'Guardar spot'
  }

  renderHero()
  renderStats(await obterEstatisticasSpot(spotId))
  renderConditions(await obterCondicoesSpot(spot))
  await Promise.all([renderImages(), renderVideos(), renderSpotComments(), renderRecommendations()])

  ui.commentForm.addEventListener('submit', submitSpotComment)
  ui.imageForm.addEventListener('submit', submitImage)
  ui.videos.addEventListener('click', onVideosClick)
  ui.videos.addEventListener('submit', onVideoComment)
  ui.report.addEventListener('click', () => reportEntity('spot', spotId))
  ui.favorite.addEventListener('click', async () => {
    if (!user) {
      showToast('Faz login para guardar favoritos.', { type: 'warning' })
      return
    }
    isFavorite = await alternarFavoritoSpot(user.id, spotId, isFavorite)
    ui.favorite.textContent = isFavorite ? 'Remover favorito' : 'Guardar spot'
  })
}

document.addEventListener('DOMContentLoaded', init)
