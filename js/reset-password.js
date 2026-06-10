import { supabase } from './supabase.js'
import {
  atualizarPassword,
  obterEmailRecuperacaoPendente,
  processarRedirecionamentoAuth
} from './auth_utils.js'

const stateBox = document.getElementById('reset-state')
const copyText = document.getElementById('reset-copy')
const form = document.getElementById('reset-form')
const newPasswordInput = document.getElementById('new-password')
const confirmPasswordInput = document.getElementById('confirm-password')
const submitButton = document.getElementById('reset-submit')
const messageBox = document.getElementById('msg')

function mostrarMensagem(texto, tipo) {
  messageBox.textContent = texto
  messageBox.className = `auth-message show ${tipo}`
}

function atualizarEstado(texto, tipo = '') {
  stateBox.textContent = texto
  stateBox.className = `reset-state${tipo ? ` ${tipo}` : ''}`
}

function mostrarFormulario(email = '') {
  form.hidden = false
  atualizarEstado('Link validado. Define agora a nova palavra-passe.')
  copyText.textContent = email
    ? `A sessao de recuperacao para ${email} esta ativa. Define uma nova palavra-passe para concluir o processo.`
    : 'A sessao de recuperacao esta ativa. Define uma nova palavra-passe para concluir o processo.'
}

function mostrarErro(texto) {
  form.hidden = true
  atualizarEstado(texto, 'error')
}

async function initRecoveryPage() {
  const redirectResult = await processarRedirecionamentoAuth()
  if (!redirectResult.sucesso) {
    mostrarErro(redirectResult.erro)
    return
  }

  const [
    {
      data: { session }
    },
    {
      data: { user }
    }
  ] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser()
  ])

  if (!session || !user) {
    const pendingEmail = obterEmailRecuperacaoPendente()
    mostrarErro(
      pendingEmail
        ? `O link para ${pendingEmail} nao abriu uma sessao valida. Volta ao email e usa o link mais recente.`
        : 'Este link de recuperacao ja nao e valido ou nao abriu sessao. Pede um novo email de recuperacao.'
    )
    return
  }

  mostrarFormulario(user.email || obterEmailRecuperacaoPendente())
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const newPassword = newPasswordInput.value.trim()
  const confirmPassword = confirmPasswordInput.value.trim()

  if (newPassword.length < 6) {
    mostrarMensagem('A nova palavra-passe tem de ter pelo menos 6 caracteres.', 'error')
    return
  }

  if (newPassword !== confirmPassword) {
    mostrarMensagem('As palavras-passe nao coincidem.', 'error')
    return
  }

  const originalHtml = submitButton.innerHTML
  submitButton.disabled = true
  submitButton.innerHTML = '<span>A guardar...</span>'

  const resultado = await atualizarPassword(newPassword)

  if (!resultado.sucesso) {
    mostrarMensagem(`Falha ao atualizar: ${resultado.erro}`, 'error')
    submitButton.disabled = false
    submitButton.innerHTML = originalHtml
    return
  }

  atualizarEstado('Palavra-passe atualizada com sucesso.', 'success')
  mostrarMensagem('Password atualizada. Vais ser redirecionado para o login.', 'success')
  copyText.textContent = 'A recuperacao foi concluida. Usa a nova palavra-passe no proximo login.'

  setTimeout(() => {
    window.location.href = '/login.html'
  }, 1800)
})

document.getElementById('reset-login').addEventListener('click', () => {
  window.location.href = '/login.html'
})

document.addEventListener('DOMContentLoaded', initRecoveryPage)
