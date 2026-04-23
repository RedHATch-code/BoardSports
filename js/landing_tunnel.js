(() => {
  const track = document.querySelector('[data-tunnel-track]')
  const stage = document.querySelector('[data-tunnel-stage]')
  const slides = Array.from(document.querySelectorAll('[data-tunnel-slide]'))
  const progressLabel = document.querySelector('[data-tunnel-progress]')
  const progressBar = document.querySelector('[data-tunnel-progress-bar]')

  if (!track || !stage || slides.length === 0) {
    return
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
  const formatIndex = (value) => String(value).padStart(2, '0')
  const totalSlides = slides.length
  const maxIndex = totalSlides - 1

  let ticking = false

  function getSpacing() {
    if (window.innerWidth <= 560) {
      return 340
    }

    if (window.innerWidth <= 768) {
      return 410
    }

    return 560
  }

  function render() {
    ticking = false

    const rect = track.getBoundingClientRect()
    const maxScroll = Math.max(1, rect.height - window.innerHeight)
    const rawProgress = clamp(-rect.top / maxScroll, 0, 1)
    const progress = clamp(rawProgress * 1.08, 0, 1)
    const activePosition = progress * maxIndex
    const spacing = getSpacing()

    stage.style.setProperty('--tunnel-progress', progress.toFixed(4))
    stage.style.setProperty('--tunnel-flight', `${(progress * spacing * 0.94).toFixed(2)}px`)

    if (progressLabel) {
      progressLabel.textContent = formatIndex(Math.round(activePosition) + 1)
    }

    if (progressBar) {
      progressBar.style.transform = `scaleX(${Math.max(0.12, progress)})`
    }

    slides.forEach((slide, index) => {
      const distance = index - activePosition
      const absoluteDistance = Math.abs(distance)
      const depth = 180 - (distance * spacing)
      const verticalShift = distance * 18
      const rotationX = clamp(distance * -4.6, -10, 10)
      const rotationY = clamp(distance * -2.4, -8, 8)
      const baseOpacity = clamp(1.12 - (absoluteDistance * 0.56), 0, 1)
      const frontFade = depth > 340 ? clamp(1 - ((depth - 340) / 260), 0, 1) : 1
      const backFade = depth < -1500 ? clamp(1 - ((Math.abs(depth) - 1500) / 420), 0, 1) : 1
      const opacity = clamp(baseOpacity * frontFade * backFade, 0, 1)
      const scale = clamp(0.8 + ((depth + spacing) / (spacing * 2.6)), 0.74, 1.08)
      const shade = clamp(1 - opacity, 0, 1)

      slide.classList.toggle('is-active', absoluteDistance < 0.34)
      slide.style.opacity = opacity.toFixed(3)
      slide.style.zIndex = String(1200 - Math.round(absoluteDistance * 100))
      slide.style.setProperty('--slide-shade', shade.toFixed(3))

      if (reducedMotion.matches) {
        slide.style.transform = `translate(-50%, -50%) scale(${clamp(1 - (absoluteDistance * 0.1), 0.84, 1).toFixed(3)})`
        return
      }

      slide.style.transform = [
        'translate(-50%, -50%)',
        `translate3d(0px, ${verticalShift.toFixed(2)}px, ${depth.toFixed(2)}px)`,
        `rotateX(${rotationX.toFixed(2)}deg)`,
        `rotateY(${rotationY.toFixed(2)}deg)`,
        `scale(${scale.toFixed(3)})`
      ].join(' ')
    })
  }

  function requestRender() {
    if (ticking) {
      return
    }

    ticking = true
    window.requestAnimationFrame(render)
  }

  window.addEventListener('scroll', requestRender, { passive: true })
  window.addEventListener('resize', requestRender)

  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', requestRender)
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(requestRender)
  }

  requestRender()
})()
