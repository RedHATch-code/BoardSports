import { fazerLogin } from './auth_utils.js'

const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const loginForm = document.getElementById('login-form')
const msgDiv = document.getElementById('msg')

function mostrarMensagem(texto, tipo) {
  msgDiv.textContent = texto
  msgDiv.className = `auth-message show ${tipo}`
  
  if (tipo === 'success') {
    setTimeout(() => {
      msgDiv.classList.remove('show')
    }, 1500)
  }
}

loginForm.onsubmit = async (e) => {
  e.preventDefault()
  
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()

  if (!email || !password) {
    mostrarMensagem('Por favor preencha email e palavra-passe', 'error')
    return
  }

  // Desabilitar botão
  const loginBtn = document.getElementById('login-btn')
  const textoOriginal = loginBtn.innerHTML
  loginBtn.disabled = true
  loginBtn.innerHTML = '<span>Entrando...</span>'

  const resultado = await fazerLogin(email, password)
  
  if (resultado.sucesso) {
    mostrarMensagem('✓ Login realizado! Redirecionando...', 'success')
    setTimeout(() => {
      window.location.href = '/dashboard.html'
    }, 1500)
  } else {
    mostrarMensagem('✗ ' + resultado.erro, 'error')
    loginBtn.disabled = false
    loginBtn.innerHTML = textoOriginal
  }
}
