import { fazerLogin, obterUsuarioAtual } from './auth_utils.js'
import { supabase } from './supabase.js'

const ADMIN_EMAIL = 'tiagomendessss2022@gmail.com'

const form = document.getElementById('admin-login-form')
const emailInput = document.getElementById('admin-email')
const passwordInput = document.getElementById('admin-password')
const button = document.getElementById('admin-login-btn')
const msgDiv = document.getElementById('admin-msg')

function mostrarMensagem(texto, tipo) {
  msgDiv.textContent = texto
  msgDiv.className = `auth-message show ${tipo}`
}

function setLoading(isLoading) {
  if (!button) return

  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.innerHTML
  }

  button.disabled = isLoading
  button.innerHTML = isLoading ? '<span>A validar admin...</span>' : button.dataset.originalLabel
}

async function terminarSessaoSemRedirect() {
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.warn('Não foi possível terminar sessão admin inválida:', error)
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault()

  const email = emailInput.value.trim().toLowerCase()
  const password = passwordInput.value

  if (email !== ADMIN_EMAIL) {
    mostrarMensagem('Este login só aceita o email do administrador principal.', 'error')
    return
  }

  if (!password) {
    mostrarMensagem('Indica a palavra-passe da conta admin.', 'error')
    return
  }

  setLoading(true)

  const resultado = await fazerLogin(email, password)
  if (!resultado.sucesso) {
    mostrarMensagem(`Falha no login admin: ${resultado.erro}`, 'error')
    setLoading(false)
    return
  }

  const user = await obterUsuarioAtual()
  const isAllowedAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL && user?.perfil?.is_admin === true

  if (!isAllowedAdmin) {
    await terminarSessaoSemRedirect()
    mostrarMensagem('A conta entrou, mas não tem permissão administrativa ativa.', 'error')
    setLoading(false)
    return
  }

  mostrarMensagem('Admin validado. A abrir moderação...', 'success')
  setTimeout(() => {
    window.location.href = '/moderacao.html'
  }, 800)
})
