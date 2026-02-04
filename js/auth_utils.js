import { supabase } from './supabase.js'

/**
 * BoardSports Inc - Sistema de Autenticação
 */

// ============================================================
// 1. VERIFICAR SESSÃO E REDIRECIONAR
// ============================================================

export async function verificarAutenticacao() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error)
    return null
  }
}

export async function obterUsuarioAtual() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Obter dados do perfil
    const { data: perfil } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return { ...user, perfil }
  } catch (error) {
    console.error('Erro ao obter utilizador:', error)
    return null
  }
}

// ============================================================
// 2. PROTEGER PÁGINAS - REDIRECIONAR SE NÃO AUTENTICADO
// ============================================================

export async function protegerPagina() {
  const session = await verificarAutenticacao()
  if (!session) {
    window.location.href = '/index.html'
    return false
  }
  return true
}

// ============================================================
// 3. LOGIN
// ============================================================

export async function fazerLogin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return { sucesso: true, data }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

// ============================================================
// 4. REGISTRO
// ============================================================

export async function fazerRegistro(email, password, role, dadosAdicionais = {}) {
  try {
    // Criar utilizador
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email.html`
      }
    })

    if (authError) throw authError

    // Criar perfil com dados adicionais
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: email,
        role: role,
        nome: dadosAdicionais.nome || null,
        telefone: dadosAdicionais.telefone || null,
        localidade: dadosAdicionais.localidade || null,
        bio: dadosAdicionais.bio || null,
        email_verificado: false,
        ativo: true
      })

    if (profileError) throw profileError

    return { sucesso: true, data, precisaVerificacao: true }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

// ============================================================
// 5. LOGOUT
// ============================================================

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

// ============================================================
// 5.1 VERIFICAÇÃO DE EMAIL
// ============================================================

export async function verificarEmailConfirmado() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    // Verificar se email está confirmado no Supabase
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
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email.html`
      }
    })

    if (error) throw error
    return { sucesso: true }
  } catch (error) {
    return { sucesso: false, erro: error.message }
  }
}

export async function atualizarStatusEmailVerificado() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('profiles')
      .update({ 
        email_verificado: true,
        data_verificacao_email: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao atualizar status de verificação:', error)
    return false
  }
}

// ============================================================
// 6. CRIAR MENU DE NAVEGAÇÃO
// ============================================================

export async function criarMenuNavegacao() {
  const usuario = await obterUsuarioAtual()
  if (!usuario) return

  const nav = document.createElement('nav')
  nav.className = 'navbar'
  nav.innerHTML = `
    <div class="navbar-container">
      <div class="navbar-brand">
        <a href="/dashboard.html">🏄 BoardSports</a>
      </div>
      
      <div class="navbar-menu">
        <ul class="navbar-nav">
          <li><a href="/dashboard.html">Home</a></li>
          <li><a href="/produtos.html">Produtos</a></li>
          ${usuario.perfil.role === 'empresa' ? '<li><a href="/empresa.html">Empresa</a></li>' : ''}
          <li><a href="/modalidades.html">Modalidades</a></li>
          <li><a href="/mapa.html">Mapa</a></li>
        </ul>
      </div>

      <div class="navbar-user">
        <span>Olá, ${usuario.perfil.nome || usuario.email}</span>
        <span class="role-badge">${usuario.perfil.role}</span>
        <button id="logout-btn" class="btn-logout">Logout</button>
      </div>
    </div>
  `

  document.body.insertBefore(nav, document.body.firstChild)

  // Adicionar evento ao botão de logout
  document.getElementById('logout-btn').onclick = fazerLogout
}

// ============================================================
// 7. INICIALIZAR PÁGINAS PROTEGIDAS
// ============================================================

export async function inicializarPaginaProtegida() {
  const autenticado = await protegerPagina()
  if (!autenticado) return

  await criarMenuNavegacao()
}

// ============================================================
// Fim do arquivo
// ============================================================
