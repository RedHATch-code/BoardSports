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

// Contador de caracteres para a bio
bioInput.addEventListener('input', () => {
  bioCounter.textContent = `${bioInput.value.length}/500`
})

function mostrarMensagem(texto, tipo) {
  msgDiv.textContent = texto
  msgDiv.className = `auth-message show ${tipo}`
  
  if (tipo === 'success') {
    setTimeout(() => {
      msgDiv.classList.remove('show')
    }, 1500)
  }
}

registerForm.onsubmit = async (e) => {
  e.preventDefault()
  
  const nome = nomeInput.value.trim()
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  const passwordConfirm = passwordConfirmInput.value.trim()
  const role = roleSelect.value
  const telefone = telefoneInput.value.trim()
  const localidade = localidadeInput.value.trim()
  const bio = bioInput.value.trim()

  // Validações
  if (!nome || !email || !password || !role) {
    mostrarMensagem('Por favor preencha email, nome, tipo e palavra-passe', 'error')
    return
  }

  if (password.length < 6) {
    mostrarMensagem('Palavra-passe deve ter pelo menos 6 caracteres', 'error')
    return
  }

  if (password !== passwordConfirm) {
    mostrarMensagem('As palavras-passe não coincidem', 'error')
    return
  }

  // Desabilitar botão
  const registerBtn = document.getElementById('register-btn')
  const textoOriginal = registerBtn.innerHTML
  registerBtn.disabled = true
  registerBtn.innerHTML = '<span>Criando conta...</span>'

  const resultado = await fazerRegistro(email, password, role, {
    nome,
    telefone: telefone || null,
    localidade: localidade || null,
    bio: bio || null
  })
  
  if (resultado.sucesso) {
    mostrarMensagem('✓ Conta criada! Verifique o seu email...', 'success')
    setTimeout(() => {
      window.location.href = '/verify-email.html'
    }, 1500)
  } else {
    mostrarMensagem('✗ ' + resultado.erro, 'error')
    registerBtn.disabled = false
    registerBtn.innerHTML = textoOriginal
  }
}
