import {
  atualizarPassword,
  inicializarPaginaProtegida,
  obterUsuarioAtual
} from './auth_utils.js'
import {
  atualizarPerfil,
  obterPerfil,
  uploadFotoPerfil
} from './db_utils.js'

const state = {
  usuario: null,
  perfil: null,
  photoUrl: '',
  selectedPhoto: null,
  previewUrl: '',
  shouldRemovePhoto: false
}

const ui = {
  heroName: null,
  heroCopy: null,
  roleBadge: null,
  adminLinkWrapper: null,
  form: null,
  email: null,
  role: null,
  nome: null,
  telefone: null,
  localidade: null,
  bio: null,
  msg: null,
  photoInput: null,
  photoMeta: null,
  removePhotoButton: null,
  avatarImage: null,
  avatarFallback: null,
  passwordForm: null,
  newPassword: null,
  confirmPassword: null,
  passwordMsg: null
}

async function inicializarConfiguracao() {
  const autenticado = await inicializarPaginaProtegida()
  if (!autenticado) return

  cacheDom()
  bindEvents()
  await carregarConfiguracao()
}

function cacheDom() {
  ui.heroName = document.getElementById('profile-hero-name')
  ui.heroCopy = document.getElementById('profile-hero-copy')
  ui.roleBadge = document.getElementById('profile-role-badge')
  ui.adminLinkWrapper = document.getElementById('profile-admin-link-wrapper')
  ui.form = document.getElementById('profile-form')
  ui.email = document.getElementById('email')
  ui.role = document.getElementById('role')
  ui.nome = document.getElementById('nome')
  ui.telefone = document.getElementById('telefone')
  ui.localidade = document.getElementById('localidade')
  ui.bio = document.getElementById('bio')
  ui.msg = document.getElementById('msg')
  ui.photoInput = document.getElementById('foto-perfil')
  ui.photoMeta = document.getElementById('photo-meta')
  ui.removePhotoButton = document.getElementById('remove-photo-btn')
  ui.avatarImage = document.getElementById('avatar-image')
  ui.avatarFallback = document.getElementById('avatar-fallback')
  ui.passwordForm = document.getElementById('password-form')
  ui.newPassword = document.getElementById('nova-password')
  ui.confirmPassword = document.getElementById('confirmar-password')
  ui.passwordMsg = document.getElementById('password-msg')
}

function bindEvents() {
  ui.form.addEventListener('submit', onSubmit)
  ui.photoInput.addEventListener('change', onPhotoSelected)
  ui.removePhotoButton.addEventListener('click', onRemovePhoto)
  ui.passwordForm.addEventListener('submit', onPasswordSubmit)
}

async function carregarConfiguracao() {
  try {
    state.usuario = await obterUsuarioAtual()
    if (!state.usuario) return

    state.perfil = await obterPerfil(state.usuario.id)
    if (!state.perfil) return

    ui.email.value = state.usuario.email || ''
    ui.role.value = state.perfil.tipo_user || 'principiante'
    ui.nome.value = state.perfil.nome || ''
    ui.telefone.value = state.perfil.telefone || ''
    ui.localidade.value = state.perfil.localidade || ''
    ui.bio.value = state.perfil.bio || ''

    state.photoUrl = state.perfil.foto_perfil || ''
    state.shouldRemovePhoto = false
    updatePhotoMeta(state.photoUrl ? 'Foto atual carregada.' : 'JPG, PNG, WebP ou GIF ate 5 MB.')

    renderHero()
    renderAvatar()
  } catch (error) {
    console.error('Erro ao carregar configuracao do perfil:', error)
    showInlineMessage('Erro ao carregar a configuracao do perfil.', 'error')
  }
}

function renderHero() {
  const displayName = ui.nome.value.trim() || state.perfil?.nome || state.usuario?.email || 'Configuracao'
  ui.heroName.textContent = `Configuracao de ${displayName}`
  ui.heroCopy.textContent = 'Atualiza foto, bio e dados da conta sem expor os detalhes na pagina principal do perfil.'
  ui.roleBadge.textContent = state.perfil?.tipo_user || state.perfil?.role || 'membro'
  ui.adminLinkWrapper.hidden = !state.perfil?.is_admin
}

function getInitials() {
  const label = ui.nome.value.trim() || state.perfil?.nome || state.usuario?.email || 'BS'
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BS'
}

function renderAvatar(previewUrl = state.photoUrl) {
  const hasPhoto = Boolean(previewUrl)
  ui.avatarFallback.textContent = getInitials()
  ui.avatarFallback.style.display = hasPhoto ? 'none' : 'inline-flex'

  if (!hasPhoto) {
    ui.avatarImage.removeAttribute('src')
    ui.avatarImage.classList.remove('is-visible')
    return
  }

  ui.avatarImage.src = previewUrl
  ui.avatarImage.classList.add('is-visible')
  ui.avatarImage.onerror = () => {
    ui.avatarImage.removeAttribute('src')
    ui.avatarImage.classList.remove('is-visible')
    ui.avatarFallback.style.display = 'inline-flex'
  }
}

function cleanupPreviewUrl() {
  if (!state.previewUrl) return
  URL.revokeObjectURL(state.previewUrl)
  state.previewUrl = ''
}

function updatePhotoMeta(message) {
  ui.photoMeta.textContent = message
}

function showInlineMessage(text, type) {
  ui.msg.hidden = false
  ui.msg.textContent = text
  ui.msg.style.color = type === 'error' ? '#fecaca' : '#d1fae5'
  ui.msg.style.border = `1px solid ${type === 'error' ? 'rgba(248, 113, 113, 0.35)' : 'rgba(52, 211, 153, 0.3)'}`
  ui.msg.style.background = type === 'error' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(5, 150, 105, 0.18)'

  clearTimeout(showInlineMessage.timeoutId)
  showInlineMessage.timeoutId = setTimeout(() => {
    ui.msg.hidden = true
  }, 3200)
}

function showPasswordMessage(text, type) {
  ui.passwordMsg.hidden = false
  ui.passwordMsg.textContent = text
  ui.passwordMsg.style.color = type === 'error' ? '#fecaca' : '#d1fae5'
  ui.passwordMsg.style.border = `1px solid ${type === 'error' ? 'rgba(248, 113, 113, 0.35)' : 'rgba(52, 211, 153, 0.3)'}`
  ui.passwordMsg.style.background = type === 'error' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(5, 150, 105, 0.18)'

  clearTimeout(showPasswordMessage.timeoutId)
  showPasswordMessage.timeoutId = setTimeout(() => {
    ui.passwordMsg.hidden = true
  }, 3600)
}

function onPhotoSelected(event) {
  const [file] = event.target.files || []
  if (!file) return

  if (!file.type.startsWith('image/')) {
    updatePhotoMeta('Seleciona um ficheiro de imagem valido.')
    event.target.value = ''
    return
  }

  cleanupPreviewUrl()
  state.selectedPhoto = file
  state.shouldRemovePhoto = false
  state.previewUrl = URL.createObjectURL(file)

  renderAvatar(state.previewUrl)
  updatePhotoMeta(`Nova foto selecionada: ${file.name}`)
}

function onRemovePhoto() {
  cleanupPreviewUrl()
  state.selectedPhoto = null
  state.shouldRemovePhoto = true
  state.photoUrl = ''
  ui.photoInput.value = ''

  renderAvatar('')
  updatePhotoMeta('A foto sera removida quando guardares o perfil.')
}

async function onSubmit(event) {
  event.preventDefault()

  if (!state.usuario) {
    showInlineMessage('Sessao invalida. Faz login novamente.', 'error')
    return
  }

  let fotoPerfil = state.photoUrl || null

  if (state.selectedPhoto) {
    updatePhotoMeta('A enviar foto para o Supabase...')
    const uploadResult = await uploadFotoPerfil(state.usuario.id, state.selectedPhoto, state.perfil?.foto_perfil || '')

    if (!uploadResult?.url) {
      updatePhotoMeta(uploadResult?.error || 'Erro ao enviar a foto.')
      showInlineMessage(uploadResult?.error || 'Erro ao enviar a foto de perfil.', 'error')
      return
    }

    fotoPerfil = uploadResult.url
  } else if (state.shouldRemovePhoto) {
    fotoPerfil = null
  }

  const updates = {
    nome: ui.nome.value.trim(),
    telefone: ui.telefone.value.trim(),
    localidade: ui.localidade.value.trim(),
    bio: ui.bio.value.trim(),
    foto_perfil: fotoPerfil
  }

  const resultado = await atualizarPerfil(state.usuario.id, updates)
  if (!resultado) {
    showInlineMessage('Erro ao atualizar perfil.', 'error')
    return
  }

  state.perfil = resultado
  state.photoUrl = resultado.foto_perfil || ''
  state.selectedPhoto = null
  state.shouldRemovePhoto = false
  ui.photoInput.value = ''
  cleanupPreviewUrl()
  renderHero()
  renderAvatar()
  updatePhotoMeta(state.photoUrl ? 'Foto guardada com sucesso.' : 'Perfil atualizado sem foto.')
  window.dispatchEvent(new CustomEvent('boardsports:header-sync'))
  showInlineMessage('Perfil atualizado com sucesso.', 'success')
}

async function onPasswordSubmit(event) {
  event.preventDefault()

  const newPassword = ui.newPassword.value.trim()
  const confirmPassword = ui.confirmPassword.value.trim()

  if (newPassword.length < 6) {
    showPasswordMessage('A nova palavra-passe tem de ter pelo menos 6 caracteres.', 'error')
    return
  }

  if (newPassword !== confirmPassword) {
    showPasswordMessage('As palavras-passe nao coincidem.', 'error')
    return
  }

  const resultado = await atualizarPassword(newPassword)
  if (!resultado.sucesso) {
    showPasswordMessage(`Falha ao atualizar a password: ${resultado.erro}`, 'error')
    return
  }

  ui.passwordForm.reset()
  showPasswordMessage('Palavra-passe atualizada com sucesso.', 'success')
}

document.addEventListener('DOMContentLoaded', inicializarConfiguracao)
