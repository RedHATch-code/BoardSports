const DEFAULT_CONFIG = {
  atmosphereColor: '#4da6ff',
  atmosphereIntensity: 20,
  bumpScale: 5,
  autoRotateSpeed: 0.3
}

const DEG_TO_RAD = Math.PI / 180

const CONTINENTS = [
  {
    id: 'north_america',
    label: 'America do Norte',
    abbr: 'NA',
    color: '#64c8ff',
    blobs: [
      { lat: 60, lng: -150, rx: 15, ry: 10, tilt: -0.3 },
      { lat: 58, lng: -112, rx: 23, ry: 13, tilt: -0.1 },
      { lat: 43, lng: -98, rx: 22, ry: 12, tilt: 0.1 },
      { lat: 25, lng: -101, rx: 12, ry: 9, tilt: -0.2 },
      { lat: 72, lng: -42, rx: 12, ry: 9, tilt: -0.2 }
    ]
  },
  {
    id: 'south_america',
    label: 'America do Sul',
    abbr: 'SA',
    color: '#338d4f',
    blobs: [
      { lat: 7, lng: -66, rx: 13, ry: 11, tilt: -0.1 },
      { lat: -12, lng: -60, rx: 16, ry: 20, tilt: 0.08 },
      { lat: -34, lng: -61, rx: 11, ry: 15, tilt: 0.15 }
    ]
  },
  {
    id: 'europe',
    label: 'Europa',
    abbr: 'EU',
    color: '#338d4f',
    blobs: [
      { lat: 54, lng: 10, rx: 14, ry: 9, tilt: -0.18 },
      { lat: 47, lng: 22, rx: 10, ry: 8, tilt: 0.1 },
      { lat: 62, lng: -4, rx: 8, ry: 6, tilt: -0.12 }
    ]
  },
  {
    id: 'africa',
    label: 'Africa',
    abbr: 'AF',
    color: '#338d4f',
    blobs: [
      { lat: 20, lng: 15, rx: 13, ry: 14, tilt: -0.06 },
      { lat: 3, lng: 20, rx: 18, ry: 19, tilt: 0.03 },
      { lat: -18, lng: 25, rx: 15, ry: 20, tilt: 0.08 }
    ]
  },
  {
    id: 'asia',
    label: 'Asia',
    abbr: 'AS',
    color: '#338d4f',
    blobs: [
      { lat: 54, lng: 62, rx: 17, ry: 12, tilt: 0.04 },
      { lat: 47, lng: 92, rx: 24, ry: 16, tilt: 0.02 },
      { lat: 28, lng: 108, rx: 20, ry: 13, tilt: -0.12 },
      { lat: 24, lng: 78, rx: 14, ry: 11, tilt: -0.2 },
      { lat: 5, lng: 105, rx: 10, ry: 8, tilt: 0.18 }
    ]
  },
  {
    id: 'oceania',
    label: 'Oceania',
    abbr: 'OC',
    color: '#338d4f',
    blobs: [
      { lat: -25, lng: 134, rx: 18, ry: 12, tilt: -0.1 },
      { lat: -6, lng: 146, rx: 9, ry: 7, tilt: 0.08 },
      { lat: -42, lng: 173, rx: 8, ry: 6, tilt: 0.15 }
    ]
  },
  {
    id: 'antarctica',
    label: 'Antartida',
    abbr: 'AN',
    color: '#338d4f',
    blobs: [
      { lat: -74, lng: 0, rx: 42, ry: 7, tilt: 0 },
      { lat: -72, lng: 95, rx: 24, ry: 6, tilt: 0.08 },
      { lat: -72, lng: -95, rx: 24, ry: 6, tilt: -0.08 }
    ]
  }
]

const GEO_LABELS = [
  { kind: 'continent', label: 'America do Norte', lat: 47, lng: -108, priority: 3 },
  { kind: 'continent', label: 'America do Sul', lat: -18, lng: -60, priority: 3 },
  { kind: 'continent', label: 'Europa', lat: 52, lng: 14, priority: 3 },
  { kind: 'continent', label: 'Africa', lat: 5, lng: 18, priority: 3 },
  { kind: 'continent', label: 'Asia', lat: 36, lng: 92, priority: 3 },
  { kind: 'continent', label: 'Oceania', lat: -22, lng: 135, priority: 3 },
  { kind: 'ocean', label: 'Oceano Atlantico', lat: 10, lng: -32, priority: 2 },
  { kind: 'ocean', label: 'Oceano Pacifico', lat: 8, lng: -145, priority: 2 },
  { kind: 'ocean', label: 'Oceano Pacifico', lat: 8, lng: 155, priority: 2 },
  { kind: 'ocean', label: 'Oceano Indico', lat: -18, lng: 82, priority: 2 },
  { kind: 'ocean', label: 'Oceano Artico', lat: 76, lng: 0, priority: 2 },
  { kind: 'country', label: 'Estados Unidos', lat: 38, lng: -97, priority: 1 },
  { kind: 'country', label: 'Canada', lat: 57, lng: -106, priority: 1 },
  { kind: 'country', label: 'Mexico', lat: 23, lng: -102, priority: 1 },
  { kind: 'country', label: 'Brasil', lat: -14, lng: -52, priority: 1 },
  { kind: 'country', label: 'Argentina', lat: -36, lng: -64, priority: 1 },
  { kind: 'country', label: 'Portugal', lat: 39.6, lng: -8.1, priority: 1 },
  { kind: 'country', label: 'Espanha', lat: 40.2, lng: -3.7, priority: 1 },
  { kind: 'country', label: 'Franca', lat: 46.2, lng: 2.2, priority: 1 },
  { kind: 'country', label: 'Reino Unido', lat: 54.5, lng: -2.5, priority: 1 },
  { kind: 'country', label: 'Marrocos', lat: 31.8, lng: -7.1, priority: 1 },
  { kind: 'country', label: 'Nigeria', lat: 9.1, lng: 8.7, priority: 1 },
  { kind: 'country', label: 'Africa do Sul', lat: -29, lng: 24, priority: 1 },
  { kind: 'country', label: 'Arabia', lat: 23.8, lng: 45.1, priority: 1 },
  { kind: 'country', label: 'India', lat: 22.6, lng: 78.9, priority: 1 },
  { kind: 'country', label: 'China', lat: 35.8, lng: 104.1, priority: 1 },
  { kind: 'country', label: 'Japao', lat: 36.2, lng: 138.2, priority: 1 },
  { kind: 'country', label: 'Australia', lat: -25.2, lng: 133.8, priority: 1 },
  { kind: 'country', label: 'Nova Zelandia', lat: -41.2, lng: 174.8, priority: 1 }
]

export class Globe3D {
  constructor({ canvas, markers = [], routes = [], config = {}, onMarkerClick = () => {}, onMarkerHover = () => {}, onContinentHover = () => {} }) {
    if (!canvas) {
      throw new Error('Globe3D precisa de um elemento canvas.')
    }

    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.onMarkerClick = onMarkerClick
    this.onMarkerHover = onMarkerHover
    this.onContinentHover = onContinentHover
    this.rotation = 0
    this.dragVelocity = 0
    this.pointer = {
      x: 0,
      y: 0,
      inside: false,
      down: false,
      moved: false,
      lastX: 0
    }
    this.hoveredMarker = null
    this.hoveredContinent = null
    this.projectedMarkers = []
    this.projectedContinents = []
    this.imageCache = new Map()
    this.continentStats = {}
    this.routes = []
    this.elapsed = 0
    this.lastFrameTime = performance.now()
    this.viewportWidth = 0
    this.viewportHeight = 0
    this.animationFrame = null
    this.stars = createStars(90)

    this.handleResize = this.handleResize.bind(this)
    this.handlePointerDown = this.handlePointerDown.bind(this)
    this.handlePointerMove = this.handlePointerMove.bind(this)
    this.handlePointerUp = this.handlePointerUp.bind(this)
    this.handlePointerLeave = this.handlePointerLeave.bind(this)
    this.animate = this.animate.bind(this)

    this.setMarkers(markers)
    this.setRoutes(routes)
    this.bindEvents()
    this.handleResize()
    this.animate()
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave)
    this.canvas.addEventListener('pointercancel', this.handlePointerUp)
    window.addEventListener('resize', this.handleResize)
  }

  setMarkers(markers = []) {
    this.markers = markers.map((marker, index) => ({
      id: marker.id || `${marker.kind || 'marker'}-${index}-${marker.label || 'untitled'}`,
      kind: marker.kind || 'marker',
      lat: Number(marker.lat),
      lng: Number(marker.lng),
      label: marker.label || 'Sem nome',
      src: marker.src || '',
      subtitle: marker.subtitle || '',
      note: marker.note || '',
      meta: marker.meta || '',
      color: marker.color || '#ff8c00',
      entityId: marker.entityId || null
    })).filter(marker => Number.isFinite(marker.lat) && Number.isFinite(marker.lng))

    this.markers.forEach(marker => {
      marker.image = this.loadImage(marker.src)
    })
  }

  setContinentStats(stats = {}) {
    this.continentStats = stats
  }

  setRoutes(routes = []) {
    this.routes = routes
      .map((route, index) => ({
        id: route.id || `route-${index}`,
        start: {
          lat: Number(route.start?.lat),
          lng: Number(route.start?.lng)
        },
        end: {
          lat: Number(route.end?.lat),
          lng: Number(route.end?.lng)
        },
        color: route.color || '#7dd3fc',
        speed: Number(route.speed || 0.16),
        label: route.label || ''
      }))
      .filter(route =>
        Number.isFinite(route.start.lat) &&
        Number.isFinite(route.start.lng) &&
        Number.isFinite(route.end.lat) &&
        Number.isFinite(route.end.lng)
      )
  }

  loadImage(src) {
    if (!src) return null
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src)
    }

    const image = new Image()
    image.decoding = 'async'
    image.src = src
    this.imageCache.set(src, image)
    return image
  }

  handleResize() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    this.viewportWidth = Math.max(rect.width, 1)
    this.viewportHeight = Math.max(rect.height, 1)
    this.canvas.width = Math.round(this.viewportWidth * dpr)
    this.canvas.height = Math.round(this.viewportHeight * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  handlePointerDown(event) {
    this.pointer.down = true
    this.pointer.moved = false
    this.pointer.inside = true
    this.pointer.lastX = event.offsetX
    this.canvas.setPointerCapture?.(event.pointerId)
  }

  handlePointerMove(event) {
    this.pointer.x = event.offsetX
    this.pointer.y = event.offsetY
    this.pointer.inside = true

    if (this.pointer.down) {
      const deltaX = event.offsetX - this.pointer.lastX
      this.pointer.lastX = event.offsetX
      this.pointer.moved = this.pointer.moved || Math.abs(deltaX) > 1
      this.rotation += deltaX * 0.01
      this.dragVelocity = deltaX * 0.0018
    }
  }

  handlePointerUp(event) {
    if (this.pointer.down && !this.pointer.moved && this.hoveredMarker) {
      this.onMarkerClick(this.hoveredMarker)
    }

    this.pointer.down = false
    this.canvas.releasePointerCapture?.(event.pointerId)
  }

  handlePointerLeave() {
    this.pointer.inside = false
    this.pointer.down = false
    this.syncHoveredMarker(null)
    this.syncHoveredContinent(null)
  }

  animate(now = performance.now()) {
    const delta = Math.min((now - this.lastFrameTime) / 16.6667, 3)
    this.lastFrameTime = now
    this.elapsed += delta * 0.01

    if (!this.pointer.down) {
      if (Math.abs(this.dragVelocity) > 0.0001) {
        this.rotation += this.dragVelocity * delta * 16
        this.dragVelocity *= 0.94
      } else {
        this.rotation += this.config.autoRotateSpeed * 0.0028 * delta
      }
    }

    this.render()
    this.animationFrame = window.requestAnimationFrame(this.animate)
  }

  render() {
    const ctx = this.ctx
    const width = this.viewportWidth
    const height = this.viewportHeight

    if (!width || !height) return

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.33

    ctx.clearRect(0, 0, width, height)
    drawStars(ctx, this.stars, width, height)
    this.drawOrbitalRings(ctx, centerX, centerY, radius)
    this.drawAtmosphere(ctx, centerX, centerY, radius)
    this.drawGlobeBody(ctx, centerX, centerY, radius)
    this.drawContinents(ctx, centerX, centerY, radius)
    this.drawGrid(ctx, centerX, centerY, radius)
    this.drawGeoLabels(ctx, centerX, centerY, radius)
    this.drawRoutes(ctx, centerX, centerY, radius)
    this.drawMarkers(ctx, centerX, centerY, radius)
    this.updateHoveredMarker()
  }

  drawOrbitalRings(ctx, centerX, centerY, radius) {
    const rings = [
      { rx: radius * 1.06, ry: radius * 1.02, rotation: -0.14, alpha: 0.1 },
      { rx: radius * 1.12, ry: radius * 0.72, rotation: 0.08, alpha: 0.08 },
      { rx: radius * 0.92, ry: radius * 1.12, rotation: 0.18, alpha: 0.06 }
    ]

    rings.forEach((ring) => {
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(ring.rotation)
      ctx.beginPath()
      ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(170, 210, 255, ${ring.alpha})`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    })
  }

  drawAtmosphere(ctx, centerX, centerY, radius) {
    const outerRadius = radius + this.config.atmosphereIntensity
    const atmosphere = ctx.createRadialGradient(centerX, centerY, radius * 0.55, centerX, centerY, outerRadius)
    atmosphere.addColorStop(0, 'rgba(77, 166, 255, 0.1)')
    atmosphere.addColorStop(0.56, hexToRgba(this.config.atmosphereColor, 0.22))
    atmosphere.addColorStop(1, 'rgba(77, 166, 255, 0)')

    ctx.beginPath()
    ctx.fillStyle = atmosphere
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  drawGlobeBody(ctx, centerX, centerY, radius) {
    const fill = ctx.createRadialGradient(centerX - radius * 0.28, centerY - radius * 0.34, radius * 0.2, centerX, centerY, radius)
    fill.addColorStop(0, '#5d84b0')
    fill.addColorStop(0.22, '#4b78aa')
    fill.addColorStop(0.56, '#23496f')
    fill.addColorStop(0.82, '#10253f')
    fill.addColorStop(1, '#04090f')

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()

    const glow = ctx.createRadialGradient(centerX + radius * 0.16, centerY - radius * 0.18, radius * 0.08, centerX, centerY, radius * 1.1)
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
    glow.addColorStop(0.3, 'rgba(180, 220, 255, 0.18)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = glow
    ctx.fill()

    const cloud = ctx.createRadialGradient(centerX - radius * 0.12, centerY - radius * 0.08, radius * 0.06, centerX, centerY, radius * 0.9)
    cloud.addColorStop(0, 'rgba(255, 255, 255, 0.18)')
    cloud.addColorStop(0.45, 'rgba(255, 255, 255, 0.05)')
    cloud.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = cloud
    ctx.fill()

    const shadow = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius)
    shadow.addColorStop(0, 'rgba(255, 255, 255, 0.06)')
    shadow.addColorStop(0.46, 'rgba(255, 255, 255, 0)')
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0.42)')
    ctx.fillStyle = shadow
    ctx.fill()
    ctx.restore()

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 1.2
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  drawGrid(ctx, centerX, centerY, radius) {
    const latitudes = [-60, -30, 0, 30, 60]
    const longitudes = []
    for (let longitude = -150; longitude <= 180; longitude += 30) {
      longitudes.push(longitude)
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.clip()

    latitudes.forEach(latitude => {
      this.drawCurve(ctx, createLatitudePoints(latitude), centerX, centerY, radius, 'rgba(157, 209, 255, 0.14)')
    })

    longitudes.forEach(longitude => {
      this.drawCurve(ctx, createLongitudePoints(longitude), centerX, centerY, radius, 'rgba(157, 209, 255, 0.1)')
    })

    ctx.restore()
  }

  drawContinents(ctx, centerX, centerY, radius) {
    this.projectedContinents = []

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.clip()

    CONTINENTS.forEach(continent => {
      const stat = this.continentStats[continent.id] || {}
      const hovered = this.hoveredContinent && this.hoveredContinent.id === continent.id
      const projectedBlobs = []

      continent.blobs.forEach(blob => {
        const point = projectPoint(blob.lat, blob.lng, this.rotation, centerX, centerY, radius)
        if (point.depth <= -0.32) return

        const scale = clamp(0.72 + ((point.depth + 1) * 0.18), 0.68, 1.04)
        const rx = radius * blob.rx * 0.01 * scale
        const ry = radius * blob.ry * 0.01 * scale

        projectedBlobs.push({
          x: point.x,
          y: point.y,
          rx,
          ry,
          rotation: blob.tilt || 0,
          depth: point.depth
        })

        ctx.save()
        ctx.translate(point.x, point.y)
        ctx.rotate(blob.tilt || 0)
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, Math.max(rx, ry) * 1.2)
        glow.addColorStop(0, hovered ? hexToRgba(continent.color, 0.34) : hexToRgba(continent.color, 0.26))
        glow.addColorStop(0.68, hovered ? hexToRgba(continent.color, 0.22) : hexToRgba(continent.color, 0.14))
        glow.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.beginPath()
        ctx.ellipse(0, 0, rx * 1.22, ry * 1.22, 0, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.fillStyle = hovered
          ? hexToRgba(continent.color, 0.42)
          : hexToRgba(continent.color, 0.24)
        ctx.fill()
        ctx.lineWidth = hovered ? 1.6 : 1
        ctx.strokeStyle = hovered
          ? hexToRgba(continent.color, 0.72)
          : 'rgba(255, 255, 255, 0.05)'
        ctx.stroke()
        ctx.restore()
      })

      if (!projectedBlobs.length) return

      const centroid = getBlobCentroid(projectedBlobs)
      this.projectedContinents.push({
        id: continent.id,
        label: continent.label,
        abbr: continent.abbr,
        color: continent.color,
        spotCount: stat.spotCount || 0,
        subtitle: stat.subtitle || '',
        note: stat.note || '',
        centroid,
        blobs: projectedBlobs
      })
    })

    ctx.restore()
  }

  drawCurve(ctx, points, centerX, centerY, radius, color) {
    let drawing = false
    ctx.lineWidth = 1

    for (let index = 0; index < points.length; index += 1) {
      const point = projectPoint(points[index].lat, points[index].lng, this.rotation, centerX, centerY, radius)
      const isFront = point.depth > -0.22

      if (!isFront) {
        drawing = false
        continue
      }

      ctx.strokeStyle = color
      if (!drawing) {
        ctx.beginPath()
        ctx.moveTo(point.x, point.y)
        drawing = true
      } else {
        ctx.lineTo(point.x, point.y)
      }
    }

    if (drawing) {
      ctx.stroke()
    }
  }

  drawGeoLabels(ctx, centerX, centerY, radius) {
    const placed = []
    const labels = GEO_LABELS
      .map((item) => ({
        ...item,
        point: projectPoint(item.lat, item.lng, this.rotation, centerX, centerY, radius)
      }))
      .filter((item) => item.point.depth > getLabelDepthThreshold(item.kind))
      .sort((left, right) => {
        if (right.priority !== left.priority) return right.priority - left.priority
        return right.point.depth - left.point.depth
      })

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.clip()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    labels.forEach((item) => {
      const style = getLabelStyle(item.kind, item.point.depth)
      ctx.font = `${style.weight} ${style.size}px Segoe UI`
      const textWidth = ctx.measureText(item.label).width
      const box = {
        left: item.point.x - (textWidth / 2) - 5,
        top: item.point.y - (style.size * 0.65),
        right: item.point.x + (textWidth / 2) + 5,
        bottom: item.point.y + (style.size * 0.65)
      }

      if (placed.some((other) => boxesOverlap(other, box))) {
        return
      }

      placed.push(box)

      ctx.fillStyle = style.shadow
      ctx.fillText(item.label, item.point.x + 1, item.point.y + 1)
      ctx.fillStyle = style.color
      ctx.fillText(item.label, item.point.x, item.point.y)
    })

    ctx.restore()
  }

  drawRoutes(ctx, centerX, centerY, radius) {
    this.routes.forEach((route, index) => {
      const points = createRoutePoints(route.start, route.end, 56)
      const projected = points.map(point => projectVector(point, this.rotation, centerX, centerY, radius))
      const visiblePoints = projected.filter(point => point.depth > -0.38)

      if (visiblePoints.length < 2) return

      ctx.save()
      ctx.beginPath()

      let drawing = false
      projected.forEach((point) => {
        if (point.depth <= -0.38) {
          drawing = false
          return
        }

        if (!drawing) {
          ctx.moveTo(point.x, point.y)
          drawing = true
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })

      ctx.strokeStyle = hexToRgba(route.color, 0.34)
      ctx.lineWidth = 1.25
      ctx.stroke()

      ctx.beginPath()
      drawing = false
      const progress = (this.elapsed * route.speed + (index * 0.13)) % 1
      projected.forEach((point, pointIndex) => {
        const lineProgress = pointIndex / Math.max(projected.length - 1, 1)
        if (lineProgress > progress || point.depth <= -0.38) {
          drawing = false
          return
        }

        if (!drawing) {
          ctx.moveTo(point.x, point.y)
          drawing = true
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })

      ctx.strokeStyle = hexToRgba(route.color, 0.98)
      ctx.lineWidth = 2.2
      ctx.stroke()

      const startPoint = projected[0]
      const endPoint = projected[projected.length - 1]
      if (startPoint && startPoint.depth > -0.3) {
        drawRouteNode(ctx, startPoint.x, startPoint.y, route.color, 7)
      }
      if (endPoint && endPoint.depth > -0.3) {
        drawRouteNode(ctx, endPoint.x, endPoint.y, route.color, 7)
      }

      const headPoint = projected[Math.min(Math.floor(progress * (projected.length - 1)), projected.length - 1)]
      if (headPoint && headPoint.depth > -0.32) {
        const glowRadius = 8 + (headPoint.depth + 1) * 2.5
        ctx.beginPath()
        ctx.fillStyle = hexToRgba(route.color, 0.28)
        ctx.arc(headPoint.x, headPoint.y, glowRadius, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = '#ffffff'
        ctx.arc(headPoint.x, headPoint.y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    })
  }

  drawMarkers(ctx, centerX, centerY, radius) {
    const projected = this.markers
      .map(marker => ({
        marker,
        ...projectPoint(marker.lat, marker.lng, this.rotation, centerX, centerY, radius)
      }))
      .filter(point => point.depth > -0.28)
      .sort((left, right) => left.depth - right.depth)

    this.projectedMarkers = projected

    projected.forEach(point => {
      this.drawMarker(ctx, point)
    })
  }

  drawMarker(ctx, point) {
    const { marker, x, y, depth } = point
    const scale = clamp(0.7 + ((depth + 1) * 0.26), 0.72, 1.1)
    const size = 13 * scale
    const hover = this.hoveredMarker && this.hoveredMarker.id === marker.id

    ctx.save()
    ctx.globalAlpha = clamp(0.42 + ((depth + 1) * 0.34), 0.48, 1)

    ctx.beginPath()
    ctx.fillStyle = hexToRgba(marker.color, hover ? 0.28 : 0.18)
    ctx.arc(x, y, size * 1.9, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.fillStyle = hexToRgba(marker.color, hover ? 0.58 : 0.38)
    ctx.arc(x, y, size * 1.28, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.fillStyle = '#1f2026'
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()

    if (marker.image && marker.image.complete) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, size - 1.5, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(marker.image, x - size, y - size, size * 2, size * 2)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.fillStyle = marker.color
      ctx.arc(x, y, size - 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.lineWidth = hover ? 2.5 : 1.6
    ctx.strokeStyle = hover ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'
    ctx.arc(x, y, size - 1.3, 0, Math.PI * 2)
    ctx.stroke()

    if (hover) {
      drawLabel(ctx, marker.label, x, y - size - 14)
    }

    ctx.restore()
  }

  updateHoveredMarker() {
    if (!this.pointer.inside || this.pointer.down) {
      if (!this.pointer.down) {
        this.syncHoveredMarker(null)
        this.syncHoveredContinent(null)
      }
      this.canvas.style.cursor = this.pointer.down ? 'grabbing' : 'grab'
      return
    }

    let hovered = null
    let minDistance = Infinity

    this.projectedMarkers.forEach(point => {
      const distance = Math.hypot(point.x - this.pointer.x, point.y - this.pointer.y)
      if (distance < 18 && distance < minDistance) {
        minDistance = distance
        hovered = point.marker
      }
    })

    this.syncHoveredMarker(hovered)
    if (hovered) {
      this.syncHoveredContinent(null)
      this.canvas.style.cursor = 'pointer'
      return
    }

    let hoveredContinent = null
    let continentDepth = -Infinity

    this.projectedContinents.forEach(continent => {
      continent.blobs.forEach(blob => {
        if (isPointInEllipse(this.pointer.x, this.pointer.y, blob) && blob.depth > continentDepth) {
          hoveredContinent = continent
          continentDepth = blob.depth
        }
      })
    })

    this.syncHoveredContinent(hoveredContinent)
    this.canvas.style.cursor = hoveredContinent ? 'crosshair' : 'grab'
  }

  syncHoveredMarker(marker) {
    const nextId = marker ? marker.id : null
    const previousId = this.hoveredMarker ? this.hoveredMarker.id : null

    if (nextId === previousId) return

    this.hoveredMarker = marker
    this.onMarkerHover(marker)
  }

  syncHoveredContinent(continent) {
    const nextId = continent ? continent.id : null
    const previousId = this.hoveredContinent ? this.hoveredContinent.id : null

    if (nextId === previousId) return

    this.hoveredContinent = continent
    this.onContinentHover(continent)
  }

  destroy() {
    window.cancelAnimationFrame(this.animationFrame)
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp)
    window.removeEventListener('resize', this.handleResize)
  }
}

function createLatitudePoints(latitude) {
  const points = []
  for (let longitude = -180; longitude <= 180; longitude += 6) {
    points.push({ lat: latitude, lng: longitude })
  }
  return points
}

function createLongitudePoints(longitude) {
  const points = []
  for (let latitude = -90; latitude <= 90; latitude += 4) {
    points.push({ lat: latitude, lng: longitude })
  }
  return points
}

function projectPoint(lat, lng, rotation, centerX, centerY, radius) {
  return projectVector(latLngToVector3(lat, lng), rotation, centerX, centerY, radius)
}

function latLngToVector3(lat, lng) {
  const latRad = lat * DEG_TO_RAD
  const lngRad = lng * DEG_TO_RAD

  return {
    x: Math.cos(latRad) * Math.cos(lngRad),
    y: Math.sin(latRad),
    z: Math.cos(latRad) * Math.sin(lngRad)
  }
}

function projectVector(vector, rotation, centerX, centerY, radius) {
  const baseX = vector.x
  const baseY = vector.y
  const baseZ = vector.z

  const cosRotation = Math.cos(rotation)
  const sinRotation = Math.sin(rotation)
  const x = (baseX * cosRotation) - (baseZ * sinRotation)
  const z = (baseX * sinRotation) + (baseZ * cosRotation)
  const perspective = clamp(0.72 + ((z + 1) * 0.18), 0.66, 1.08)

  return {
    x: centerX + (x * radius * perspective),
    y: centerY - (baseY * radius * perspective),
    depth: z
  }
}

function createRoutePoints(start, end, steps) {
  const startVector = latLngToVector3(start.lat, start.lng)
  const endVector = latLngToVector3(end.lat, end.lng)
  const points = []

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const curve = Math.sin(Math.PI * t) * 0.18
    const point = slerpVectors(startVector, endVector, t)
    points.push(scaleVector(normalizeVector(point), 1 + curve))
  }

  return points
}

function slerpVectors(start, end, t) {
  const dot = clamp((start.x * end.x) + (start.y * end.y) + (start.z * end.z), -1, 1)
  const theta = Math.acos(dot)

  if (theta < 0.0001) {
    return {
      x: start.x,
      y: start.y,
      z: start.z
    }
  }

  const sinTheta = Math.sin(theta)
  const a = Math.sin((1 - t) * theta) / sinTheta
  const b = Math.sin(t * theta) / sinTheta

  return {
    x: (start.x * a) + (end.x * b),
    y: (start.y * a) + (end.y * b),
    z: (start.z * a) + (end.z * b)
  }
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  }
}

function scaleVector(vector, scalar) {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  }
}

function getBlobCentroid(blobs) {
  const weighted = blobs.reduce((acc, blob) => {
    const weight = blob.depth + 1.4
    acc.x += blob.x * weight
    acc.y += blob.y * weight
    acc.weight += weight
    return acc
  }, { x: 0, y: 0, weight: 0 })

  if (!weighted.weight) {
    return { x: blobs[0].x, y: blobs[0].y }
  }

  return {
    x: weighted.x / weighted.weight,
    y: weighted.y / weighted.weight
  }
}

function isPointInEllipse(x, y, blob) {
  const dx = x - blob.x
  const dy = y - blob.y
  const cos = Math.cos(-blob.rotation)
  const sin = Math.sin(-blob.rotation)
  const localX = (dx * cos) - (dy * sin)
  const localY = (dx * sin) + (dy * cos)

  return ((localX * localX) / (blob.rx * blob.rx)) + ((localY * localY) / (blob.ry * blob.ry)) <= 1
}

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.45 + 0.2
  }))
}

function getLabelDepthThreshold(kind) {
  if (kind === 'country') return 0.14
  if (kind === 'ocean') return 0.02
  return -0.02
}

function getLabelStyle(kind, depth) {
  const alphaBase = clamp(0.35 + ((depth + 1) * 0.22), 0.42, 0.92)

  if (kind === 'continent') {
    return {
      size: 15,
      weight: 700,
      color: `rgba(238, 244, 255, ${alphaBase})`,
      shadow: 'rgba(4, 8, 14, 0.68)'
    }
  }

  if (kind === 'ocean') {
    return {
      size: 11,
      weight: 600,
      color: `rgba(147, 203, 255, ${alphaBase * 0.86})`,
      shadow: 'rgba(5, 10, 18, 0.62)'
    }
  }

  return {
    size: 10,
    weight: 600,
    color: `rgba(214, 224, 238, ${alphaBase * 0.82})`,
    shadow: 'rgba(5, 10, 18, 0.58)'
  }
}

function boxesOverlap(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  )
}

function drawStars(ctx, stars, width, height) {
  stars.forEach(star => {
    ctx.beginPath()
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`
    ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawRouteNode(ctx, x, y, color, radius) {
  ctx.beginPath()
  ctx.fillStyle = hexToRgba(color, 0.2)
  ctx.arc(x, y, radius * 2.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.fillStyle = color
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.fillStyle = '#ffffff'
  ctx.arc(x, y, Math.max(radius * 0.28, 1.8), 0, Math.PI * 2)
  ctx.fill()
}

function drawLabel(ctx, label, x, y) {
  const paddingX = 10
  const paddingY = 6
  ctx.font = '600 12px Segoe UI'
  const textWidth = ctx.measureText(label).width
  const width = textWidth + (paddingX * 2)
  const height = 28
  const left = x - (width / 2)
  const top = y - height

  ctx.beginPath()
  roundRect(ctx, left, top, width, height, 14)
  ctx.fillStyle = 'rgba(3, 6, 10, 0.84)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, left + paddingX, top + paddingY + 9)
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '')
  const size = normalized.length === 3 ? 1 : 2
  const values = normalized.match(new RegExp(`.{1,${size}}`, 'g')) || []
  const [red, green, blue] = values.map(value => {
    const full = size === 1 ? `${value}${value}` : value
    return parseInt(full, 16)
  })

  return `rgba(${red || 77}, ${green || 166}, ${blue || 255}, ${alpha})`
}
