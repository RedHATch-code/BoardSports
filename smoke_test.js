const baseUrl = process.env.BASE_URL || process.argv[2] || 'http://127.0.0.1:8000'

const checks = [
  {
    path: '/login.html',
    markers: ['id="login-form"', 'autocomplete="email"', 'autocomplete="current-password"']
  },
  {
    path: '/register.html',
    markers: ['id="register-form"', 'autocomplete="new-password"', 'autocomplete="tel"']
  },
  {
    path: '/perfil.html',
    markers: ['id="profile-form"', 'id="orders-list"', 'id="registrations-list"']
  },
  {
    path: '/mapa.html',
    markers: ['id="globe-canvas"', 'id="map"']
  },
  {
    path: '/empresa.html',
    markers: ['id="form-produto"', 'id="produtos-empresa"', 'id="btn-guardar-perfil"']
  },
  {
    path: '/produtos.html',
    markers: ['id="cart-items"', 'id="checkout-form"', 'id="review-form"']
  },
  {
    path: '/moderacao.html',
    markers: ['id="moderation-list"', 'id="moderation-refresh"']
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
  console.error('Start the local server with: node run_server.js')
  process.exit(1)
})
