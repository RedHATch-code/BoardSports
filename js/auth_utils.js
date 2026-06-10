import { supabase } from './supabase.js'

const PENDING_SIGNUP_EMAIL_KEY = 'boardsports.pending-signup-email'
const PENDING_RECOVERY_EMAIL_KEY = 'boardsports.pending-recovery-email'
const AUTH_REDIRECT_TYPES = new Set(['signup', 'recovery', 'invite', 'magiclink', 'email_change', 'email'])

function normalizeProfileRole(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['empresa', 'atleta', 'cliente'].includes(normalized)) return normalized
  return 'atleta'
}

function normalizeBoardSportsType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'pro') return 'pro'
  if (normalized === 'intermedio' || normalized === 'intermédio') return 'intermedio'
  if (normalized === 'principiante') return 'principiante'
  if (normalized === 'atleta') return 'principiante'
  if (normalized === 'cliente') return 'principiante'
  return 'principiante'
}

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

export function obterUrlRecuperacaoPassword() {
  return buildAuthRedirectUrl('/reset-password.html')
}

function getLegacyProfilePayload(payload) {
  const legacy = { ...payload }
  delete legacy.tipo_user
  delete legacy.xp_total
  delete legacy.nivel_xp
  return legacy
}

function isMissingProfileXpColumn(error) {
  const message = error?.message?.toLowerCase?.() || ''
  return error?.code === '42703'
    || message.includes('tipo_user')
    || message.includes('xp_total')
    || message.includes('nivel_xp')
}

function buildProfileDraft(tipoUser, dadosAdicionais = {}, email = '') {
  const boardSportsType = normalizeBoardSportsType(dadosAdicionais.tipo_user || tipoUser)

  return {
    role: normalizeProfileRole(dadosAdicionais.role || 'atleta'),
    tipo_user: boardSportsType,
    xp_total: Number(dadosAdicionais.xp_total || 0),
    nivel_xp: Number(dadosAdicionais.nivel_xp || 1),
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

  const role = normalizeProfileRole(
    normalizeOptionalString(existingProfile?.role)
      || normalizeOptionalString(fallbackProfile.role)
      || normalizeOptionalString(metadataProfile.role)
      || normalizeOptionalString(metadata.role)
      || 'cliente'
  )

  return {
    id: user.id,
    role,
    tipo_user: normalizeBoardSportsType(
      normalizeOptionalString(existingProfile?.tipo_user)
        || normalizeOptionalString(fallbackProfile.tipo_user)
        || normalizeOptionalString(metadataProfile.tipo_user)
        || normalizeOptionalString(metadata.tipo_user)
        || 'principiante'
    ),
    xp_total: Number(existingProfile?.xp_total ?? fallbackProfile.xp_total ?? metadataProfile.xp_total ?? metadata.xp_total ?? 0),
    nivel_xp: Number(existingProfile?.nivel_xp ?? fallbackProfile.nivel_xp ?? metadataProfile.nivel_xp ?? metadata.nivel_xp ?? 1),
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

    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const hashType = hashParams.get('type')
    if (accessToken && refreshToken && (!hashType || AUTH_REDIRECT_TYPES.has(hashType))) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      if (error) throw error
      window.history.replaceState({}, document.title, window.location.pathname)
      return { sucesso: true, metodo: 'hash', type: hashType || null }
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

    let { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error && isMissingProfileXpColumn(error)) {
      const retry = await supabase
        .from('profiles')
        .upsert(getLegacyProfilePayload(payload), { onConflict: 'id' })
        .select('*')
        .single()

      data = retry.data
      error = retry.error
    }

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
    const rawMessage = error.message || ''
    const normalizedMessage = rawMessage.toLowerCase()

    if (normalizedMessage.includes('email not confirmed')) {
      guardarEmailRegistoPendente(email)

      return {
        sucesso: false,
        codigo: 'email_not_confirmed',
        erro: 'Este email ainda nao foi confirmado. Abre o link que recebeste no email ou pede um novo envio na pagina de verificacao.'
      }
    }

    if (normalizedMessage.includes('invalid login credentials')) {
      return {
        sucesso: false,
        codigo: 'invalid_credentials',
        erro: 'Email ou palavra-passe incorretos.'
      }
    }

    return { sucesso: false, erro: rawMessage || 'Nao foi possivel iniciar sessao.' }
  }
}

export async function fazerRegistro(email, password, tipoUser, dadosAdicionais = {}) {
  try {
    const profileDraft = buildProfileDraft(tipoUser, dadosAdicionais, email)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildAuthRedirectUrl('/verify-email.html'),
        data: {
          role: profileDraft.role,
          tipo_user: profileDraft.tipo_user,
          xp_total: profileDraft.xp_total,
          nivel_xp: profileDraft.nivel_xp,
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
      precisaVerificacao: !data.session,
      confirmacaoAindaAtiva: !data.session
    }
  } catch (error) {
    const rawMessage = error.message || ''
    const normalizedMessage = rawMessage.toLowerCase()

    if (normalizedMessage.includes('sending confirmation email')) {
      return {
        sucesso: false,
        codigo: 'confirmation_email_failed',
        erro: 'Nao foi possivel enviar o email de confirmacao. Confirma se o envio de emails do Supabase esta disponivel para o projeto.'
      }
    }

    return { sucesso: false, erro: rawMessage || 'Nao foi possivel criar a conta.' }
  }
}

export async function pedirRecuperacaoPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: obterUrlRecuperacaoPassword()
    })

    if (error) throw error

    guardarEmailRecuperacaoPendente(email)
    return { sucesso: true }
  } catch (error) {
    return {
      sucesso: false,
      codigo: 'password_recovery_failed',
      erro: error.message || 'Nao foi possivel enviar o email de recuperacao.'
    }
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
