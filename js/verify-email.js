import { supabase } from './supabase.js'
import {
  atualizarStatusEmailVerificado,
  garantirPerfilUtilizador,
  limparEmailRegistoPendente,
  obterEmailRegistoPendente,
  processarRedirecionamentoAuth,
  resendEmailConfirmation
} from './auth_utils.js'
import { showToast } from './ui_feedback.js'

const statusMessage = document.getElementById('status-message')
const statusText = document.getElementById('status-text')
const verifyTitle = document.getElementById('verify-title')
const verifyText = document.getElementById('verify-text')
const verifyIcon = document.getElementById('verify-icon')
const verifyButtons = document.getElementById('verify-buttons')
const errorButtons = document.getElementById('error-buttons')
const loadingText = document.getElementById('loading-text')

let userEmail = obterEmailRegistoPendente()

function mostrarSucesso() {
  verifyIcon.textContent = 'OK'
  verifyTitle.textContent = 'Email verificado com sucesso'
  verifyText.textContent = 'A tua conta foi ativada e o perfil ficou sincronizado com o Supabase.'

  statusMessage.className = 'status-message success'
  statusText.textContent = 'Email confirmado com sucesso.'
  loadingText.textContent = 'Redirecionamento automatico para o mapa em 3 segundos.'

  verifyButtons.style.display = 'flex'
  errorButtons.style.display = 'none'

  setTimeout(() => {
    window.location.href = '/mapa.html'
  }, 3000)
}

function mostrarAguardando() {
  verifyIcon.textContent = '...'
  verifyTitle.textContent = 'A aguardar confirmacao'
  verifyText.textContent = userEmail
    ? `O registo de ${userEmail} foi criado. Abre o link mais recente que recebeste por email para concluir a ativacao.`
    : 'Estamos a aguardar a confirmacao do teu email. Abre o link recebido para concluir a ativacao.'

  statusMessage.className = 'status-message loading'
  statusText.innerHTML = '<span class="spinner"></span><span>Conta criada. Falta apenas confirmar o email.</span>'
  loadingText.textContent = 'Se o email nao chegou, usa o botao abaixo para pedir novo envio.'

  verifyButtons.style.display = 'flex'
  errorButtons.style.display = 'none'
}

function mostrarErro(mensagem) {
  verifyIcon.textContent = 'ERR'
  verifyTitle.textContent = 'Nao foi possivel validar a conta'
  verifyText.textContent = mensagem

  statusMessage.className = 'status-message error'
  statusText.textContent = mensagem
  loadingText.textContent = ''

  verifyButtons.style.display = 'none'
  errorButtons.style.display = 'flex'
}

async function verificarEmail() {
  try {
    const redirectResult = await processarRedirecionamentoAuth()
    if (!redirectResult.sucesso) {
      mostrarErro(redirectResult.erro)
      return
    }

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      if (userEmail) {
        mostrarAguardando()
        return
      }

      mostrarErro('Nao existe sessao valida neste browser. Usa o link mais recente do email ou faz login novamente.')
      return
    }

    userEmail = user.email || userEmail

    if (user.email_confirmed_at) {
      await garantirPerfilUtilizador(user, { email: user.email })
      await atualizarStatusEmailVerificado()
      limparEmailRegistoPendente()
      mostrarSucesso()
      return
    }

    mostrarAguardando()
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    mostrarErro(error.message || 'Erro inesperado ao validar o email.')
  }
}

document.getElementById('goto-dashboard').addEventListener('click', () => {
  window.location.href = '/mapa.html'
})

document.getElementById('resend-email').addEventListener('click', async () => {
  if (!userEmail) {
    showToast('Nao existe email pendente para reenvio.', { type: 'error' })
    return
  }

  const btn = document.getElementById('resend-email')
  btn.disabled = true
  btn.textContent = 'A enviar...'

  const resultado = await resendEmailConfirmation(userEmail)

  if (resultado.sucesso) {
    statusMessage.className = 'status-message success'
    statusText.textContent = 'Novo email de confirmacao enviado com sucesso.'
    showToast('Email reenviado com sucesso.', { type: 'success' })
  } else {
    statusMessage.className = 'status-message error'
    statusText.textContent = `Falha no reenvio: ${resultado.erro}`
    showToast('Nao foi possivel reenviar o email.', { type: 'error' })
  }

  btn.disabled = false
  btn.textContent = 'Reenviar email'
})

document.getElementById('retry-verify').addEventListener('click', () => {
  location.reload()
})

document.getElementById('back-login').addEventListener('click', () => {
  window.location.href = '/login.html'
})

document.addEventListener('DOMContentLoaded', verificarEmail)
