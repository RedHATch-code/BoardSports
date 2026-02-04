import { inicializarPaginaProtegida, obterUsuarioAtual } from './auth_utils.js'
import { obterModalidades, criarProduto, atualizarPerfil, obterProdutosEmpresa } from './db_utils.js'

let usuarioAtual = null

async function initEmpresa() {
  await inicializarPaginaProtegida()
  usuarioAtual = await obterUsuarioAtual()

  if (!usuarioAtual || usuarioAtual.perfil?.role !== 'empresa') {
    document.body.innerHTML = '<div style="padding:40px;color:#fff;">Apenas empresas podem aceder a esta área.</div>'
    return
  }

  configurarTabs()
  await carregarModalidades()
  await carregarProdutosEmpresa()
  preencherPerfilAtual()
  configurarEventos()
}

function configurarTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active')
    })
  })
}

async function carregarModalidades() {
  const modalidades = await obterModalidades()
  const select = document.getElementById('produto-modalidade')
  select.innerHTML = '<option value="">Selecionar Modalidade</option>' +
    modalidades.map(m => `<option value="${m.id}">${m.nome}</option>`).join('')
}

function configurarEventos() {
  document.getElementById('btn-importar').addEventListener('click', importarDadosSite)
  document.getElementById('btn-guardar-perfil').addEventListener('click', guardarPerfil)

  document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault()
    await criarProdutoEmpresa()
  })
}

function preencherPerfilAtual() {
  const perfil = usuarioAtual?.perfil || {}
  document.getElementById('empresa-nome').value = perfil.nome || ''
  document.getElementById('empresa-bio').value = perfil.bio || ''
  document.getElementById('empresa-logo-url').value = perfil.foto_perfil || ''
  document.getElementById('empresa-site').value = perfil.website_url || ''
  atualizarPreview()
}

function atualizarPreview() {
  const nome = document.getElementById('empresa-nome').value.trim()
  const bio = document.getElementById('empresa-bio').value.trim()
  const logo = document.getElementById('empresa-logo-url').value.trim()
  const preview = document.getElementById('empresa-preview')
  const logoEl = document.getElementById('empresa-logo')

  if (nome || bio || logo) {
    preview.style.display = 'flex'
    document.getElementById('empresa-nome-preview').textContent = nome || 'Empresa'
    document.getElementById('empresa-bio-preview').textContent = bio || ''
    if (logo) {
      logoEl.src = logo
    } else {
      logoEl.removeAttribute('src')
    }
  } else {
    preview.style.display = 'none'
  }
}

async function importarDadosSite() {
  const inputUrl = document.getElementById('empresa-url').value.trim()
  if (!inputUrl) return alert('Insere o link do site da empresa.')

  const normalized = inputUrl.replace(/^https?:\/\//, '')
  const proxyUrls = [
    `https://r.jina.ai/https://${normalized}`,
    `https://r.jina.ai/http://${normalized}`
  ]

  let html = null
  for (const url of proxyUrls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      html = await res.text()
      if (html) break
    } catch (error) {
      // ignore and try next
    }
  }

  if (!html) {
    alert('Não foi possível importar os dados automaticamente. Verifica o link.')
    return
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = obterMeta(doc, 'og:site_name') ||
    obterMeta(doc, 'og:title') ||
    doc.querySelector('title')?.textContent ||
    ''
  const descricao = obterMeta(doc, 'og:description') ||
    obterMeta(doc, 'description') ||
    ''
  const logo = obterMeta(doc, 'og:image') || obterIcone(doc, inputUrl)

  document.getElementById('empresa-nome').value = title.trim()
  document.getElementById('empresa-bio').value = descricao.trim()
  document.getElementById('empresa-logo-url').value = logo || ''
  document.getElementById('empresa-site').value = inputUrl
  atualizarPreview()
}

function obterMeta(doc, name) {
  return doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
    doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
    ''
}

function obterIcone(doc, baseUrl) {
  const icon = doc.querySelector('link[rel~="icon"]')?.getAttribute('href')
  if (!icon) return ''
  try {
    return new URL(icon, baseUrl).href
  } catch (error) {
    return icon
  }
}

async function guardarPerfil() {
  const updates = {
    nome: document.getElementById('empresa-nome').value.trim(),
    bio: document.getElementById('empresa-bio').value.trim(),
    foto_perfil: document.getElementById('empresa-logo-url').value.trim(),
    website_url: document.getElementById('empresa-site').value.trim()
  }

  const resultado = await atualizarPerfil(usuarioAtual.id, updates)
  if (!resultado) {
    alert('Erro ao guardar o perfil.')
    return
  }
  alert('Perfil da empresa atualizado com sucesso!')
  atualizarPreview()
}

async function criarProdutoEmpresa() {
  const produto = {
    empresa_id: usuarioAtual.id,
    nome: document.getElementById('produto-nome').value.trim(),
    descricao: document.getElementById('produto-descricao').value.trim(),
    preco: parseFloat(document.getElementById('produto-preco').value),
    stock: parseInt(document.getElementById('produto-stock').value || '0', 10),
    modalidade_id: parseInt(document.getElementById('produto-modalidade').value)
  }

  const resultado = await criarProduto(produto)
  if (!resultado) {
    alert('Erro ao adicionar produto.')
    return
  }

  document.getElementById('form-produto').reset()
  await carregarProdutosEmpresa()
}

async function carregarProdutosEmpresa() {
  const container = document.getElementById('produtos-empresa')
  const produtos = await obterProdutosEmpresa(usuarioAtual.id)

  if (!produtos.length) {
    container.innerHTML = '<p style="color:#aaa;">Ainda não tens produtos.</p>'
    return
  }

  container.innerHTML = produtos.map(produto => `
    <div class="produto-card">
      <h4>${produto.nome}</h4>
      <p style="color:#bbb;margin:0 0 6px 0;">${produto.descricao || 'Sem descrição'}</p>
      <small style="color:#888;">Modalidade: ${produto.modalidades?.nome || 'N/D'}</small>
      <div style="margin-top:8px;color:#ff8c00;font-weight:700;">€${Number(produto.preco).toFixed(2)}</div>
      <div style="color:#888;font-size:12px;">Stock: ${produto.stock ?? 0}</div>
    </div>
  `).join('')
}

document.addEventListener('input', (e) => {
  if (['empresa-nome', 'empresa-bio', 'empresa-logo-url'].includes(e.target.id)) {
    atualizarPreview()
  }
})

document.addEventListener('DOMContentLoaded', initEmpresa)
