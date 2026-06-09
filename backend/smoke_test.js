const baseUrl = process.env.BASE_URL || process.argv[2] || 'http://127.0.0.1:8000'

const checks = [
  {
    path: '/',
    markers: ['<title>', 'data-cinematic-reel', 'id="contactos"', 'class="home-contact-strip"', 'riftsuport.tm@gmail.com', 'class="footer-sponsor-pill"']
  },
  {
    path: '/login.html',
    markers: ['id="login-form"', 'autocomplete="email"', 'autocomplete="current-password"', 'js/auth.js?v=phpmailer-20260506']
  },
  {
    path: '/register.html',
    markers: ['id="register-form"', 'autocomplete="new-password"', 'autocomplete="tel"']
  },
  {
    path: '/reset-password.html',
    markers: ['id="reset-form"', 'id="new-password"', 'id="confirm-password"']
  },
  {
    path: '/verify-email.html',
    markers: ['id="verify-icon"', 'id="retry-verify"', 'id="back-login"']
  },
  {
    path: '/perfil.html',
    markers: ['id="publications-list"', 'id="followers-list"', 'id="message-form"', 'id="message-content"']
  },
  {
    path: '/configuracao.html',
    markers: ['id="profile-form"', 'id="password-form"', 'id="avatar-image"']
  },
  {
    path: '/mapa.html',
    markers: ['id="map"', 'id="spots-container"', 'id="form-video"', 'id="form-xp"', 'id="video-tipo-autoria"']
  },
  {
    path: '/videos.html',
    markers: ['id="videos-grid"', 'id="videos-search"', 'id="videos-modalidade-filter"']
  },
  {
    path: '/leaderboard.html',
    markers: ['id="leaderboard-list"', 'id="leaderboard-filter"', 'id="xp-levels-grid"']
  },
  {
    path: '/moderacao.html',
    markers: ['id="moderation-list"', 'id="moderation-refresh"', 'id="xp-submissions-list"', 'id="reports-list"']
  },
  {
    path: '/spot.html?id=1',
    markers: ['id="spot-detail-hero"', 'id="spot-comments"', 'id="spot-recommendations"']
  },
  {
    path: '/pesquisa.html',
    markers: ['id="global-search-input"', 'id="global-search-results"']
  },
  {
    path: '/notificacoes.html',
    markers: ['id="notifications-list"', 'id="notifications-refresh"']
  },
  {
    path: '/sobre.html',
    markers: ['Sobre', 'institutional-shell']
  },
  {
    path: '/contacto.html',
    markers: ['Contacto', 'mailto:riftsuport.tm@gmail.com']
  },
  {
    path: '/termos.html',
    markers: ['Termos', 'Uso aceitável']
  },
  {
    path: '/privacidade.html',
    markers: ['Privacidade', 'Dados de conta']
  },
  {
    path: '/404.html',
    markers: ['404', 'Spot fora do mapa', 'assets/images/boardsports-mix.jpg']
  }
]

async function fetchPage(pathname) {
  const response = await fetch(new URL(pathname, baseUrl))

  if (!response.ok) {
    throw new Error(`${pathname} returned HTTP ${response.status}`)
  }

  return response.text()
}

async function run() {
  for (const check of checks) {
    const html = await fetchPage(check.path)

    for (const marker of check.markers) {
      if (!html.includes(marker)) {
        throw new Error(`${check.path} is missing marker: ${marker}`)
      }
    }

    console.log(`SMOKE_OK ${check.path}`)
  }

  console.log(`Smoke checks completed against ${baseUrl}`)
}

run().catch((error) => {
  console.error(`SMOKE_FAIL ${error.message}`)
  console.error('Start the local server with: npm start')
  process.exit(1)
})

