import { inicializarPaginaProtegida, obterUsuarioAtual } from './auth_utils.js'
import { obterPerfil, atualizarPerfil } from './db_utils.js'

async function inicializarPerfil() {
  await inicializarPaginaProtegida()
  await carregarPerfil()
  setupFormSubmit()
}

async function carregarPerfil() {
  try {
    const usuario = await obterUsuarioAtual()
    if (!usuario) return

    const perfil = await obterPerfil(usuario.id)
    if (!perfil) return

    document.getElementById('email').value = usuario.email
    document.getElementById('role').value = perfil.role
    document.getElementById('nome').value = perfil.nome || ''
    document.getElementById('telefone').value = perfil.telefone || ''
    document.getElementById('localidade').value = perfil.localidade || ''
    document.getElementById('bio').value = perfil.bio || ''
  } catch (error) {
    console.error('Erro ao carregar perfil:', error)
  }
}

function setupFormSubmit() {
  document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault()

    const usuario = await obterUsuarioAtual()
    if (!usuario) return

    const updates = {
      nome: document.getElementById('nome').value,
      telefone: document.getElementById('telefone').value,
      localidade: document.getElementById('localidade').value,
      bio: document.getElementById('bio').value
    }

    const resultado = await atualizarPerfil(usuario.id, updates)
    const msgDiv = document.getElementById('msg')

    if (resultado) {
      msgDiv.className = 'msg success'
      msgDiv.innerText = 'Perfil atualizado com sucesso!'
      msgDiv.style.display = 'block'
    } else {
      msgDiv.className = 'msg error'
      msgDiv.innerText = 'Erro ao atualizar perfil'
      msgDiv.style.display = 'block'
    }

    setTimeout(() => {
      msgDiv.style.display = 'none'
    }, 3000)
  }
}

document.addEventListener('DOMContentLoaded', inicializarPerfil)
