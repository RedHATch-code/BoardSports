function initLandingPage() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setupCinematicReel(prefersReducedMotion)
  setupHoverDepth(prefersReducedMotion)
  setupScrollProgress(prefersReducedMotion)
  setupGsapAnimations(prefersReducedMotion)
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
  if (window.matchMedia('(pointer: coarse)').matches) return

  const cards = Array.from(document.querySelectorAll('.home-contact-card'))
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (prefersReducedMotion) return
      const rect = card.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      card.style.transform = `perspective(900px) rotateX(${y * -3}deg) rotateY(${x * 4}deg) translateY(-3px)`
    })

    card.addEventListener('pointerleave', () => {
      card.style.transform = ''
    })
  })
}

function setupScrollProgress(prefersReducedMotion) {
  if (prefersReducedMotion) return

  let progress = document.querySelector('[data-landing-scroll-progress]')
  if (!progress) {
    progress = document.createElement('span')
    progress.className = 'landing-scroll-progress'
    progress.setAttribute('data-landing-scroll-progress', '')
    progress.setAttribute('aria-hidden', 'true')
    document.body.appendChild(progress)
  }

  let ticking = false

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0
    progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`
    ticking = false
  }

  const requestUpdate = () => {
    if (ticking) return
    ticking = true
    window.requestAnimationFrame(update)
  }

  update()
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate)
}

function setupGsapAnimations(prefersReducedMotion) {
  if (!window.gsap || prefersReducedMotion) return
  if (window.matchMedia('(max-width: 700px)').matches) return

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

  gsap.utils.toArray('.home-contact-strip, .site-footer').forEach((element) => {
    gsap.fromTo(element, {
      y: 44,
      opacity: 0
    }, {
      scrollTrigger: {
        trigger: element,
        start: 'top 96%',
        once: true
      },
      y: 0,
      opacity: 1,
      duration: 0.85,
      ease: 'power3.out'
    })
  })

  if (!window.matchMedia('(max-width: 900px)').matches) {
    gsap.to('.hero-reel__media', {
      scrollTrigger: {
        trigger: '.hero-reel',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8
      },
      yPercent: 6,
      ease: 'none'
    })
  }
}
