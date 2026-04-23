import { supabase } from './supabase.js'

const PENDING_SIGNUP_EMAIL_KEY = 'boardsports.pending-signup-email'
const PENDING_RECOVERY_EMAIL_KEY = 'boardsports.pending-recovery-email'
const AUTH_REDIRECT_TYPES = new Set(['signup', 'recovery', 'invite', 'magiclink', 'email_change', 'email'])

function normalizeOptionalString(value) {
  const text = String(value || '').trim()
  return text || null
}

function readStorage(key) {
  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    return null
  }
}

function writeStorage(key, value) {
  try {
    if (!value) {
      window.localStorage.removeItem(key)
      return
    }

    window.localStorage.setItem(key, value)
  } catch (error) {
    console.warn('Nao foi possivel guardar estado local de auth:', error)
  }
}

function buildAuthRedirectUrl(pathname) {
  return `${window.location.origin}${pathname}`
}

function buildProfileDraft(role, dadosAdicionais = {}, email = '') {
  return {
    role: normalizeOptionalString(role) || 'cliente',
    nome: normalizeOptionalString(dadosAdicionais.nome),
    telefone: normalizeOptionalString(dadosAdicionais.telefone),
    localidade: normalizeOptionalString(dadosAdicionais.localidade),
    bio: normalizeOptionalString(dadosAdicionais.bio),
    email: normalizeOptionalString(email)
  }
}

async function obterPerfilCru(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

function buildProfilePayload(user, existingProfile = null, fallbackProfile = {}) {
  const metadata = user?.user_metadata || {}
  const metadataProfile = metadata.profile || {}

  const role = normalizeOptionalString(existingProfile?.role)
    || normalizeOptionalString(fallbackProfile.role)
    || normalizeOptionalString(metadataProfile.role)
    || normalizeOptionalString(metadata.role)
    || 'cliente'

  return {
    id: user.id,
    role,
    nome: normalizeOptionalString(existingProfile?.nome)
      || normalizeOptionalString(fallbackProfile.nome)
      || normalizeOptionalString(metadataProfile.nome)
      || normalizeOptionalString(metadata.nome),
    email: normalizeOptionalString(user.email)
      || normalizeOptionalString(existingProfile?.email)
      || normalizeOptionalString(fallbackProfile.email),
    telefone: normalizeOptionalString(existingProfile?.telefone)
      || normalizeOptionalString(fallbackProfile.telefone)
      || normalizeOptionalString(metadataProfile.telefone)
      || normalizeOptionalString(metadata.telefone),
    localidade: normalizeOptionalString(existingProfile?.localidade)
      || normalizeOptionalString(fallbackProfile.localidade)
      || normalizeOptionalString(metadataProfile.localidade)
      || normalizeOptionalString(metadata.localidade),
    bio: normalizeOptionalString(existingProfile?.bio)
      || normalizeOptionalString(fallbackProfile.bio)
      || normalizeOptionalString(metadataProfile.bio)
      || normalizeOptionalString(metadata.bio),
    foto_perfil: normalizeOptionalString(existingProfile?.foto_perfil),
    website_url: normalizeOptionalString(existingProfile?.website_url),
    email_verificado: Boolean(user.email_confirmed_at || existingProfile?.email_verificado),
    data_verificacao_email: user.email_confirmed_at || existingProfile?.data_verificacao_email || null,
    ativo: existingProfile?.ativo ?? true
  }
}

export function obterEmailRegistoPendente() {
  return readStorage(PENDING_SIGNUP_EMAIL_KEY)
}

export function guardarEmailRegistoPendente(email) {
  writeStorage(PENDING_SIGNUP_EMAIL_KEY, normalizeOptionalString(email))
}

export function limparEmailRegistoPendente() {
  writeStorage(PENDING_SIGNUP_EMAIL_KEY, '')
}

export function obterEmailRecuperacaoPendente() {
  return readStorage(PENDING_RECOVERY_EMAIL_KEY)
}

export function guardarEmailRecuperacaoPendente(email) {
  writeStorage(PENDING_RECOVERY_EMAIL_KEY, normalizeOptionalString(email))
}

export function limparEmailRecuperacaoPendente() {
  writeStorage(PENDING_RECOVERY_EMAIL_KEY, '')
}

export async function processarRedirecionamentoAuth() {
  try {
    const currentUrl = new URL(window.location.href)
    const searchParams = currentUrl.searchParams
    const hashParams = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : currentUrl.hash)
    const rawError = searchParams.get('error_description') || hashParams.get('error_description')

    if (rawError) {
      return {
        sucesso: false,
        erro: decodeURIComponent(rawError.replaceAll('+', ' '))
      }
    }

    const authCode = searchParams.get('code')
    if (authCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(authCode)
      if (error) throw error
      window.history.replaceState({}, document.title, window.location.pathname)
      return { sucesso: true, metodo: 'code' }
    }

    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    if (tokenHash && AUTH_REDIRECT_TYPES.has(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) throw error
      window.history.replaceState({}, document.title, window.location.pathname)
      return { sucesso: true, metodo: 'token_hash', type }
    }

    return { sucesso: true, metodo: 'session' }
  } catch (error) {
    return { sucesso: false, erro: error.message || 'Nao foi possivel processar o link de autenticacao.' }
  }
}

export async function garantirPerfilUtilizador(user = null, fallbackProfile = {}) {
  try {
    let currentUser = user

    if (!currentUser) {
      const {
        data: { user: fetchedUser }
      } = await supabase.auth.getUser()
      currentUser = fetchedUser
    }

    if (!currentUser) return null

    const existingProfile = await obterPerfilCru(currentUser.id).catch((error) => {
      console.warn('Nao foi possivel obter o perfil antes do upsert:', error)
      return null
    })

    const payload = buildProfilePayload(currentUser, existingProfile, fallbackProfile)

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao garantir perfil do utilizador:', error)
    return null
  }
}

export async function verificarAutenticacao() {
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession()

    return session
  } catch (error) {
    console.error('Erro ao verificar autenticacao:', error)
    return null
  }
}

export async function obterUsuarioAtual() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return null

    let perfil = await obterPerfilCru(user.id)
    if (!perfil) {
      perfil = await garantirPerfilUtilizador(user)
    }

    return { ...user, perfil }
  } catch (error) {
    console.error('Erro ao obter utilizador:', error)
    return null
  }
}

export async function protegerPagina() {
  const session = await verificarAutenticacao()
  if (!session) {
    window.location.href = '/login.html'
    return false
  }

  return true
}

export async function fazerLogin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    await garantirPerfilUtilizador(data.user, { email })

    if (data.user?.email_confirmed_at) {
      limparEmailRegistoPendente()
    }

    return { sucesso: true, data }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

export async function fazerRegistro(email, password, role, dadosAdicionais = {}) {
  try {
    const profileDraft = buildProfileDraft(role, dadosAdicionais, email)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildAuthRedirectUrl('/verify-email.html'),
        data: {
          role: profileDraft.role,
          nome: profileDraft.nome,
          telefone: profileDraft.telefone,
          localidade: profileDraft.localidade,
          bio: profileDraft.bio,
          profile: profileDraft
        }
      }
    })

    if (authError) throw authError

    guardarEmailRegistoPendente(email)

    if (data.session && data.user) {
      await garantirPerfilUtilizador(data.user, profileDraft)
      limparEmailRegistoPendente()
    }

    return {
      sucesso: true,
      data,
      email,
      precisaVerificacao: !data.session
    }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

export async function pedirRecuperacaoPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthRedirectUrl('/reset-password.html')
    })

    if (error) throw error

    guardarEmailRecuperacaoPendente(email)
    return { sucesso: true }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

export async function atualizarPassword(novaPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: novaPassword
    })

    if (error) throw error
    limparEmailRecuperacaoPendente()
    return { sucesso: true, data }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

export async function fazerLogout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    window.location.href = '/index.html'
    return { sucesso: true }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

export async function verificarEmailConfirmado() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return false
    return user.email_confirmed_at !== null
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    return false
  }
}

export async function resendEmailConfirmation(email) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl('/verify-email.html')
      }
    })

    if (error) throw error

    guardarEmailRegistoPendente(email)
    return { sucesso: true }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

export async function atualizarStatusEmailVerificado() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return false

    const perfil = await garantirPerfilUtilizador(user)
    if (!perfil) return false

    const { error } = await supabase
      .from('profiles')
      .update({
        email_verificado: true,
        data_verificacao_email: user.email_confirmed_at || new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) throw error
    limparEmailRegistoPendente()
    return true
  } catch (error) {
    console.error('Erro ao atualizar status de verificacao:', error)
    return false
  }
}

export async function criarMenuNavegacao() {
  window.dispatchEvent(new CustomEvent('boardsports:header-sync'))
}

export async function inicializarPaginaProtegida() {
  const autenticado = await protegerPagina()
  if (!autenticado) return false

  await criarMenuNavegacao()
  return true
}
