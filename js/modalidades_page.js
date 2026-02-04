import { inicializarPaginaProtegida } from './auth_utils.js'
import { obterModalidades, obterCategoriasPorModalidade } from './db_utils.js'

const emojis = {
  'Surf': '🏄',
  'Skate': '🛹',
  'Skimboard': '🏄',
  'Snowboard': '🏂',
  'Sandboard': '🏜️'
}

let scrollRaf = null
let activeLayerIndex = 0
let layers = []

async function inicializarModalidades() {
  await inicializarPaginaProtegida()
  await carregarModalidades()
  configurarTunelScroll()
}

function configurarTunelScroll() {
  const stage = document.getElementById('tunnel-stage')
  const scrollSpace = document.getElementById('tunnel-scroll-space')

  if (!stage || !scrollSpace || layers.length === 0) return

  scrollSpace.style.height = `${Math.max(layers.length, 1) * 100}vh`

  const atualizarTunel = () => {
    const rawIndex = window.scrollY / window.innerHeight
    const index = Math.min(layers.length - 1, Math.max(0, Math.round(rawIndex)))
    const local = rawIndex - Math.floor(rawIndex)

    if (index !== activeLayerIndex) {
      if (layers[activeLayerIndex]) layers[activeLayerIndex].classList.remove('is-active')
      if (layers[index]) layers[index].classList.add('is-active')
      activeLayerIndex = index
    }

    const depth = -local * 260
    const scale = 1 - local * 0.08
    const tilt = -local * 3

    stage.style.setProperty('--tunnel-depth', `${depth}px`)
    stage.style.setProperty('--tunnel-scale', `${scale.toFixed(3)}`)
    stage.style.setProperty('--tunnel-tilt', `${tilt.toFixed(2)}deg`)

    if (layers[index]) {
      layers[index].style.setProperty('--orbit-collapse', local.toFixed(2))
    }
  }

  const onScroll = () => {
    if (scrollRaf) return
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null
      atualizarTunel()
    })
  }

  window.addEventListener('scroll', onScroll)
  window.addEventListener('resize', atualizarTunel)
  atualizarTunel()
}

async function carregarModalidades() {
  try {
    const modalidades = await obterModalidades()
    const container = document.getElementById('modalidades-container')

    container.innerHTML = ''
    layers = []
    activeLayerIndex = 0

    for (const [index, modalidade] of modalidades.entries()) {
      const emoji = emojis[modalidade.nome] || '🏄'
      const categorias = await obterCategoriasPorModalidade(modalidade.id)
      const categoriasHtml = categorias.length
        ? (() => {
          const rings = categorias.length > 8 ? 3 : categorias.length > 4 ? 2 : 1
          const perRing = Math.ceil(categorias.length / rings)
          const baseRadius = 320
          const ringGap = 80
          return categorias.map((cat, catIndex) => {
            const ringIndex = catIndex % rings
            const posIndex = Math.floor(catIndex / rings)
            const angle = (Math.PI * 2 / perRing) * posIndex - Math.PI / 2 + (ringIndex * (Math.PI / perRing))
            const radius = baseRadius + ringIndex * ringGap
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            const delay = (catIndex % 6) * 0.2
            return `<span class="categoria-tag" style="--orbit-x:${x.toFixed(1)}px;--orbit-y:${y.toFixed(1)}px;--orbit-delay:${delay}s">${cat.nome}</span>`
          }).join('')
        })()
        : '<span class="categoria-empty">Categorias em breve...</span>'

      const layer = document.createElement('div')
      layer.className = 'modalidade-layer'
      if (index === 0) layer.classList.add('is-active')

      const card = document.createElement('div')
      card.className = 'modalidade-card'

      const orbit = document.createElement('div')
      orbit.className = 'modalidade-categorias'
      orbit.innerHTML = categoriasHtml

      card.innerHTML = `
        <div class="modalidade-icon">${emoji}</div>
        <div class="modalidade-info">
          <h3>${modalidade.nome}</h3>
          <p>${modalidade.descricao}</p>
        </div>
        <div class="modalidade-cta">
          <span>Explorar</span>
          <div>+</div>
        </div>
      `

      card.onclick = () => {
        window.location.href = `produtos.html?modalidade=${modalidade.id}`
      }

      layer.appendChild(orbit)
      layer.appendChild(card)
      container.appendChild(layer)
      layers.push(layer)
    }
  } catch (error) {
    console.error('Erro ao carregar modalidades:', error)
  }
}

document.addEventListener('DOMContentLoaded', inicializarModalidades)
