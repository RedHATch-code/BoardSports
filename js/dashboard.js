import { inicializarPaginaProtegida } from './auth_utils.js'
import { obterModalidades } from './db_utils.js'

async function inicializarDashboard() {
  // Verificar autenticação e criar menu
  await inicializarPaginaProtegida()

  // Carregar modalidades
  await carregarModalidades()
}

async function carregarModalidades() {
  try {
    const modalidades = await obterModalidades()
    const container = document.getElementById('modalidades-container')
    
    container.innerHTML = ''
    
    modalidades.forEach(modalidade => {
      const card = document.createElement('div')
      card.className = 'card'
      card.style.cursor = 'pointer'
      card.innerHTML = `
        <h3>${modalidade.nome}</h3>
        <p>${modalidade.descricao}</p>
      `
      card.onclick = () => {
        // Ir para página de produtos dessa modalidade
        window.location.href = `/produtos.html?modalidade=${modalidade.id}`
      }
      container.appendChild(card)
    })
  } catch (error) {
    console.error('Erro ao carregar modalidades:', error)
  }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', inicializarDashboard)
