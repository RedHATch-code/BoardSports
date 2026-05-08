const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://boardsportsinc-tm2026.netlify.app').replace(/\/$/, '')

const entriesToCopy = [
  'assets',
  'css',
  'js',
  'configuracao.html',
  'index.html',
  'leaderboard.html',
  'login.html',
  'mapa.html',
  'moderacao.html',
  'perfil.html',
  'register.html',
  'reset-password.html',
  'verify-email.html',
  'videos.html'
]

const pageMeta = {
  'index.html': {
    title: 'BoardSports Inc - Spots, Riders e Ranking XP',
    description: 'Descobre spots, publica vídeos, acompanha riders, ganha XP e vive a cultura board sports numa plataforma cinematográfica e intuitiva.'
  },
  'login.html': {
    title: 'Entrar na BoardSports - Acesso a Perfil, Spots e XP',
    description: 'Inicia sessão na BoardSports para criar spots, publicar vídeos, enviar mensagens e acompanhar o teu progresso XP.'
  },
  'register.html': {
    title: 'Criar Conta BoardSports - Junta-te à Comunidade',
    description: 'Cria uma conta BoardSports para guardar perfil, publicar spots, partilhar vídeos e participar no ranking XP.'
  },
  'reset-password.html': {
    title: 'Recuperar Palavra-passe - BoardSports',
    description: 'Recupera o acesso à tua conta BoardSports com um link seguro de redefinição de palavra-passe.'
  },
  'verify-email.html': {
    title: 'Verificar Email - BoardSports',
    description: 'Confirma o email dà tua conta BoardSports para concluir o acesso à comunidade.'
  },
  'perfil.html': {
    title: 'Perfil BoardSports - Publicações, Mensagens e XP',
    description: 'Consulta o teu perfil BoardSports, publicações, seguidores, mensagens e progresso XP.'
  },
  'configuracao.html': {
    title: 'Configuração de Perfil - BoardSports',
    description: 'Atualiza dados de perfil, avatar, palavra-passe e preferências dà tua conta BoardSports.'
  },
  'mapa.html': {
    title: 'Mapa de Spots BoardSports - Descobre e Publica Locais',
    description: 'Explora spots públicos no mapa, cria novos locais, publica vídeos e submete provas para ganhar XP.'
  },
  'videos.html': {
    title: 'Vídeos dos Spots BoardSports - Galeria da Comunidade',
    description: 'Vê vídeos curtos e longos publicados nos spots da comunidade BoardSports, com ligação direta ao mapa.'
  },
  'leaderboard.html': {
    title: 'Leaderboard BoardSports - Ranking XP da Comunidade',
    description: 'Acompanha o ranking XP global, semanal, mensal e por modalidade na comunidade BoardSports.'
  },
  'moderacao.html': {
    title: 'Moderação BoardSports - Painel Administrativo',
    description: 'Painel restrito para administradores validarem spots públicos e submissões XP.'
  }
}

function copyEntry(entry) {
  const source = path.join(rootDir, entry)
  const destination = path.join(distDir, entry)

  if (!fs.existsSync(source)) {
    throw new Error(`Missing build input: ${entry}`)
  }

  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    filter: (sourcePath) => !sourcePath.includes(`${path.sep}.DS_Store`)
  })
}

function escapeJs(value = '') {
  return String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")
}

function generateEnvFile() {
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

  fs.writeFileSync(
    path.join(distDir, 'env.js'),
    `export const SUPABASE_URL = '${escapeJs(supabaseUrl)}'\nexport const SUPABASE_ANON_KEY = '${escapeJs(supabaseAnonKey)}'\n`
  )
}

function upsertHeadTag(html, tag, matcher) {
  if (matcher.test(html)) return html.replace(matcher, tag)
  return html.replace('</head>', `  ${tag}\n</head>`)
}

function injectAccessibility(html) {
  if (!/id=["']main-content["']/.test(html) && /<main\b/i.test(html)) {
    html = html.replace(/<main\b/i, '<main id="main-content"')
  }

  if (/id=["']main-content["']/.test(html) && !/class=["']skip-link["']/.test(html)) {
    html = html.replace(
      /<body([^>]*)>/i,
      '<body$1>\n<a class="skip-link" href="#main-content">Saltar para o conteúdo</a>'
    )
  }

  return html
}

function injectSeo() {
  for (const [fileName, meta] of Object.entries(pageMeta)) {
    const filePath = path.join(distDir, fileName)
    if (!fs.existsSync(filePath)) continue

    const canonical = `${siteUrl}/${fileName === 'index.html' ? '' : fileName}`
    const image = `${siteUrl}/assets/images/boardsports-mix.jpg`
    let html = fs.readFileSync(filePath, 'utf8')

    html = injectAccessibility(html)
    html = html.replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`)
    html = upsertHeadTag(html, '<meta name="description" content="' + meta.description + '">', /<meta\s+name=["']description["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta property="og:type" content="website">', /<meta\s+property=["']og:type["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta property="og:title" content="' + meta.title + '">', /<meta\s+property=["']og:title["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta property="og:description" content="' + meta.description + '">', /<meta\s+property=["']og:description["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta property="og:image" content="' + image + '">', /<meta\s+property=["']og:image["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta property="og:url" content="' + canonical + '">', /<meta\s+property=["']og:url["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta name="twitter:card" content="summary_large_image">', /<meta\s+name=["']twitter:card["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta name="twitter:title" content="' + meta.title + '">', /<meta\s+name=["']twitter:title["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta name="twitter:description" content="' + meta.description + '">', /<meta\s+name=["']twitter:description["'][^>]*>/i)
    html = upsertHeadTag(html, '<meta name="twitter:image" content="' + image + '">', /<meta\s+name=["']twitter:image["'][^>]*>/i)
    html = upsertHeadTag(html, '<link rel="canonical" href="' + canonical + '">', /<link\s+rel=["']canonical["'][^>]*>/i)
    html = upsertHeadTag(html, '<link rel="icon" type="image/png" href="/assets/images/logotipo.png">', /<link\s+rel=["']icon["'][^>]*>/i)

    if (fileName === 'mapa.html') {
      html = upsertHeadTag(html, '<link rel="preconnect" href="https://unpkg.com" crossorigin>', /<link\s+rel=["']preconnect["']\s+href=["']https:\/\/unpkg\.com["'][^>]*>/i)
      html = upsertHeadTag(html, '<link rel="preconnect" href="https://a.basemaps.cartocdn.com" crossorigin>', /<link\s+rel=["']preconnect["']\s+href=["']https:\/\/a\.basemaps\.cartocdn\.com["'][^>]*>/i)
    }

    fs.writeFileSync(filePath, html)
  }
}

function writeCrawlerFiles() {
  const urls = Object.keys(pageMeta)
    .map((fileName) => `  <url><loc>${siteUrl}/${fileName === 'index.html' ? '' : fileName}</loc></url>`)
    .join('\n')

  fs.writeFileSync(path.join(distDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`)
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
}

fs.rmSync(distDir, { recursive: true, force: true })
fs.mkdirSync(distDir, { recursive: true })

for (const entry of entriesToCopy) {
  copyEntry(entry)
}

generateEnvFile()
injectSeo()
writeCrawlerFiles()

console.log(`Static site built in ${path.relative(rootDir, distDir)}`)
