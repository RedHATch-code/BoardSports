import { fazerLogin, pedirRecuperacaoPassword } from './auth_utils.js'

const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const loginForm = document.getElementById('login-form')
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

loginForm.onsubmit = async (event) => {
  event.preventDefault()

  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()

  if (!email || !password) {
    mostrarMensagem('Preenche email e palavra-passe.', 'error')
    return
  }

  const loginBtn = document.getElementById('login-btn')
  const textoOriginal = loginBtn.innerHTML
  loginBtn.disabled = true
  loginBtn.innerHTML = '<span>A entrar...</span>'

  const resultado = await fazerLogin(email, password)

  if (resultado.sucesso) {
    mostrarMensagem('Login realizado. A redirecionar...', 'success')
    setTimeout(() => {
      window.location.href = '/dashboard.html'
    }, 1200)
    return
  }

  mostrarMensagem(`Falha no login: ${resultado.erro}`, 'error')
  loginBtn.disabled = false
  loginBtn.innerHTML = textoOriginal
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
    mostrarMensagem('Email de recuperacao enviado. Verifica a tua caixa de entrada.', 'success')
  } else {
    mostrarMensagem(`Falha ao enviar recuperacao: ${resultado.erro}`, 'error')
  }

  forgotPasswordButton.disabled = false
  forgotPasswordButton.textContent = originalText
})
