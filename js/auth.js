import {
  fazerLogin,
  pedirRecuperacaoPassword,
  resendEmailConfirmation
} from './auth_utils.js'

const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const loginForm = document.getElementById('login-form')
const loginButton = document.getElementById('login-btn')
const msgDiv = document.getElementById('msg')
const forgotPasswordButton = document.getElementById('forgot-password')

function mostrarMensagem(texto, tipo) {
  msgDiv.textContent = texto
  msgDiv.className = `auth-message show ${tipo}`

  if (tipo === 'success') {
    setTimeout(() => {
      msgDiv.classList.remove('show')
    }, 2400)
  }
}

function definirEstadoBotao(botao, ativo, texto) {
  if (!botao) return

  if (!botao.dataset.originalLabel) {
    botao.dataset.originalLabel = botao.innerHTML
  }

  botao.disabled = ativo

  if (ativo && texto) {
    botao.innerHTML = texto
    return
  }

  botao.innerHTML = botao.dataset.originalLabel
}

function definirEstadoProcessamento() {
  definirEstadoBotao(loginButton, true, '<span>A entrar...</span>')
  forgotPasswordButton.disabled = true
}

function limparEstadoProcessamento() {
  definirEstadoBotao(loginButton, false)
  forgotPasswordButton.disabled = false
}

function redirecionarParaDashboard() {
  setTimeout(() => {
    window.location.href = '/mapa.html'
  }, 900)
}

loginForm.onsubmit = async (event) => {
  event.preventDefault()

  const email = emailInput.value.trim()
  const password = passwordInput.value

  if (!email || !password) {
    mostrarMensagem('Preenche email e palavra-passe.', 'error')
    return
  }

  definirEstadoProcessamento()

  const resultado = await fazerLogin(email, password)

  if (resultado.sucesso) {
    mostrarMensagem('Login realizado. A redirecionar...', 'success')
    redirecionarParaDashboard()
    return
  }

  if (resultado.codigo === 'email_not_confirmed') {
    await resendEmailConfirmation(email).catch(() => null)
  }

  mostrarMensagem(`Falha no login: ${resultado.erro}`, 'error')
  limparEstadoProcessamento()
}

forgotPasswordButton?.addEventListener('click', async () => {
  const email = emailInput.value.trim()

  if (!email) {
    mostrarMensagem('Indica primeiro o email para receberes o link de recuperacao.', 'error')
    emailInput.focus()
    return
  }

  const originalText = forgotPasswordButton.textContent
  forgotPasswordButton.disabled = true
  forgotPasswordButton.textContent = 'A enviar...'

  const resultado = await pedirRecuperacaoPassword(email)

  if (resultado.sucesso) {
    mostrarMensagem('Pedido enviado. Se a conta existir, vais receber o email de recuperacao. Verifica tambem Spam/Promocoes.', 'success')
  } else {
    mostrarMensagem(`Falha ao enviar recuperacao: ${resultado.erro}`, 'error')
  }

  forgotPasswordButton.disabled = false
  forgotPasswordButton.textContent = originalText
})
