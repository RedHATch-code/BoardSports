import { fazerRegistro } from './auth_utils.js'

const nomeInput = document.getElementById('nome')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const passwordConfirmInput = document.getElementById('password-confirm')
const telefoneInput = document.getElementById('telefone')
const localidadeInput = document.getElementById('localidade')
const bioInput = document.getElementById('bio')
const registerForm = document.getElementById('register-form')
const msgDiv = document.getElementById('msg')
const bioCounter = document.getElementById('bio-counter')
const nextButton = document.getElementById('register-next-btn')
const backButton = document.getElementById('register-back-btn')
const stepPanels = [...document.querySelectorAll('[data-register-step]')]
const stepIndicators = [...document.querySelectorAll('[data-step-indicator]')]

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

function setStep(step) {
  stepPanels.forEach((panel) => {
    const isActive = Number(panel.dataset.registerStep) === step
    panel.hidden = !isActive
    panel.classList.toggle('is-active', isActive)
  })

  stepIndicators.forEach((indicator) => {
    indicator.classList.toggle('is-active', Number(indicator.dataset.stepIndicator) <= step)
  })

  msgDiv.classList.remove('show')
}

function validateFirstStep() {
  const nome = nomeInput.value.trim()
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  const passwordConfirm = passwordConfirmInput.value.trim()

  if (!nome || !email || !password || !passwordConfirm) {
    mostrarMensagem('Preenche nome, email e palavra-passe.', 'error')
    return false
  }

  if (!emailInput.validity.valid) {
    mostrarMensagem('Indica um email valido.', 'error')
    emailInput.focus()
    return false
  }

  if (password.length < 6) {
    mostrarMensagem('A palavra-passe tem de ter pelo menos 6 caracteres.', 'error')
    passwordInput.focus()
    return false
  }

  if (password !== passwordConfirm) {
    mostrarMensagem('As palavras-passe nao coincidem.', 'error')
    passwordConfirmInput.focus()
    return false
  }

  return true
}

nextButton?.addEventListener('click', () => {
  if (!validateFirstStep()) return
  setStep(2)
  telefoneInput.focus()
})

backButton?.addEventListener('click', () => {
  setStep(1)
  nomeInput.focus()
})

registerForm.onsubmit = async (event) => {
  event.preventDefault()

  const nome = nomeInput.value.trim()
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  const passwordConfirm = passwordConfirmInput.value.trim()
  const tipoUser = 'principiante'
  const telefone = telefoneInput.value.trim()
  const localidade = localidadeInput.value.trim()
  const bio = bioInput.value.trim()

  if (!validateFirstStep()) {
    setStep(1)
    return
  }

  const registerBtn = document.getElementById('register-btn')
  const textoOriginal = registerBtn.innerHTML
  registerBtn.disabled = true
  registerBtn.innerHTML = '<span>A criar conta...</span>'

  const resultado = await fazerRegistro(email, password, tipoUser, {
    role: 'atleta',
    tipo_user: tipoUser,
    nome,
    telefone: telefone || null,
    localidade: localidade || null,
    bio: bio || null
  })

  if (resultado.sucesso) {
    if (resultado.precisaVerificacao) {
      mostrarMensagem('Conta criada. Verifica o teu email para ativar a conta.', 'success')
      setTimeout(() => {
        window.location.href = '/verify-email.html'
      }, 1200)
      return
    }

    mostrarMensagem('Conta criada com sucesso. A entrar no mapa...', 'success')
    setTimeout(() => {
      window.location.href = '/mapa.html'
    }, 1200)
    return
  }

  if (resultado.codigo === 'confirmation_email_failed') {
    mostrarMensagem(`Falha no registo: ${resultado.erro}`, 'error')
    registerBtn.disabled = false
    registerBtn.innerHTML = textoOriginal
    return
  }

  mostrarMensagem(`Falha no registo: ${resultado.erro}`, 'error')
  registerBtn.disabled = false
  registerBtn.innerHTML = textoOriginal
}
