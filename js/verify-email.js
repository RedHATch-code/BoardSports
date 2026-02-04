import { supabase } from './supabase.js'
import { atualizarStatusEmailVerificado, resendEmailConfirmation } from './auth_utils.js'

const statusMessage = document.getElementById('status-message')
const statusText = document.getElementById('status-text')
const verifyTitle = document.getElementById('verify-title')
const verifyText = document.getElementById('verify-text')
const verifyIcon = document.getElementById('verify-icon')
const verifyButtons = document.getElementById('verify-buttons')
const errorButtons = document.getElementById('error-buttons')
const loadingText = document.getElementById('loading-text')

let userEmail = null

async function verificarEmail() {
  try {
    // Pequeno delay para garantir que a sessão foi atualizada
    await new Promise(resolve => setTimeout(resolve, 2000))

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      mostrarErro('Utilizador não encontrado. Faça login novamente.')
      return
    }

    userEmail = user.email

    // Verificar se email está confirmado
    if (user.email_confirmed_at) {
      // Atualizar status na base de dados
      await atualizarStatusEmailVerificado()
      
      mostrarSucesso()
    } else {
      mostrarAguardando()
    }
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    mostrarErro('Erro ao verificar email. Tente novamente mais tarde.')
  }
}

function mostrarSucesso() {
  verifyIcon.textContent = '✅'
  verifyTitle.textContent = 'Email Verificado com Sucesso!'
  verifyText.textContent = 'A sua conta foi ativada. Pode agora aceder ao BoardSports.'
  
  statusMessage.className = 'status-message success'
  statusText.textContent = 'Email confirmado com sucesso!'
  loadingText.textContent = 'Redirecionando em 3 segundos...'
  
  verifyButtons.style.display = 'flex'
  errorButtons.style.display = 'none'
  
  // Redirecionar automaticamente
  setTimeout(() => {
    window.location.href = '/dashboard.html'
  }, 3000)
}

function mostrarAguardando() {
  verifyIcon.textContent = '⏳'
  verifyTitle.textContent = 'Email Ainda Não Confirmado'
  verifyText.textContent = `Verifique o seu email (${userEmail}) e clique no link de confirmação.`
  
  statusMessage.className = 'status-message loading'
  statusText.innerHTML = '<span class="spinner"></span><span>Aguardando confirmação do email...</span>'
  loadingText.textContent = 'Se não recebeu o email, pode reenviá-lo abaixo.'
  
  verifyButtons.style.display = 'flex'
  errorButtons.style.display = 'none'
}

function mostrarErro(mensagem) {
  verifyIcon.textContent = '❌'
  verifyTitle.textContent = 'Erro na Verificação'
  verifyText.textContent = mensagem
  
  statusMessage.className = 'status-message error'
  statusText.textContent = mensagem
  loadingText.textContent = ''
  
  verifyButtons.style.display = 'none'
  errorButtons.style.display = 'flex'
}

// Eventos dos botões
document.getElementById('goto-dashboard').addEventListener('click', () => {
  window.location.href = '/dashboard.html'
})

document.getElementById('resend-email').addEventListener('click', async () => {
  if (!userEmail) {
    alert('Email não encontrado')
    return
  }

  const btn = document.getElementById('resend-email')
  btn.disabled = true
  btn.textContent = 'Enviando...'

  const resultado = await resendEmailConfirmation(userEmail)
  
  if (resultado.sucesso) {
    statusMessage.className = 'status-message success'
    statusText.textContent = 'Email reenviado com sucesso! Verifique a sua caixa de entrada.'
    setTimeout(() => {
      btn.disabled = false
      btn.textContent = 'Reenviar Email'
    }, 3000)
  } else {
    statusMessage.className = 'status-message error'
    statusText.textContent = 'Erro ao reenviar email: ' + resultado.erro
    btn.disabled = false
    btn.textContent = 'Reenviar Email'
  }
})

document.getElementById('retry-verify').addEventListener('click', () => {
  location.reload()
})

document.getElementById('back-login').addEventListener('click', () => {
  window.location.href = '/index.html'
})

// Iniciar verificação quando a página carregar
document.addEventListener('DOMContentLoaded', verificarEmail)
