import { fazerRegistro } from './auth_utils.js'

const nomeInput = document.getElementById('nome')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const passwordConfirmInput = document.getElementById('password-confirm')
const roleSelect = document.getElementById('role')
const telefoneInput = document.getElementById('telefone')
const localidadeInput = document.getElementById('localidade')
const bioInput = document.getElementById('bio')
const registerForm = document.getElementById('register-form')
const msgDiv = document.getElementById('msg')
const bioCounter = document.getElementById('bio-counter')

bioInput.addEventListener('input', () => {
  bioCounter.textContent = `${bioInput.value.length}/500`
})

function mostrarMensagem(texto, tipo) {
  msgDiv.textContent = texto
  msgDiv.className = `auth-message show ${tipo}`

  if (tipo === 'success') {
    setTimeout(() => {
      msgDiv.classList.remove('show')
    }, 2200)
  }
}

registerForm.onsubmit = async (event) => {
  event.preventDefault()

  const nome = nomeInput.value.trim()
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  const passwordConfirm = passwordConfirmInput.value.trim()
  const role = roleSelect.value
  const telefone = telefoneInput.value.trim()
  const localidade = localidadeInput.value.trim()
  const bio = bioInput.value.trim()

  if (!nome || !email || !password || !role) {
    mostrarMensagem('Preenche nome, email, tipo de conta e palavra-passe.', 'error')
    return
  }

  if (password.length < 6) {
    mostrarMensagem('A palavra-passe tem de ter pelo menos 6 caracteres.', 'error')
    return
  }

  if (password !== passwordConfirm) {
    mostrarMensagem('As palavras-passe nao coincidem.', 'error')
    return
  }

  const registerBtn = document.getElementById('register-btn')
  const textoOriginal = registerBtn.innerHTML
  registerBtn.disabled = true
  registerBtn.innerHTML = '<span>A criar conta...</span>'

  const resultado = await fazerRegistro(email, password, role, {
    nome,
    telefone: telefone || null,
    localidade: localidade || null,
    bio: bio || null
  })

  if (resultado.sucesso) {
    if (resultado.precisaVerificacao) {
      mostrarMensagem('Conta criada. Verifica o email para ativar o acesso.', 'success')
      setTimeout(() => {
        window.location.href = '/verify-email.html'
      }, 1200)
      return
    }

    mostrarMensagem('Conta criada com sucesso. A entrar no dashboard...', 'success')
    setTimeout(() => {
      window.location.href = '/dashboard.html'
    }, 1200)
    return
  }

  mostrarMensagem(`Falha no registo: ${resultado.erro}`, 'error')
  registerBtn.disabled = false
  registerBtn.innerHTML = textoOriginal
}
