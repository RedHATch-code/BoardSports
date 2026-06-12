
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/env.js'

const CONSOLE_GUARD_KEY = '__boardsportsConsoleGuard'

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function getSafeConsoleArg(value) {
  if (!value || typeof value !== 'object') return value

  if (value instanceof Error) {
    return `${value.name || 'Error'}: ${value.message || 'Erro inesperado'}`
  }

  if (!isPlainObject(value)) {
    return `[${value.constructor?.name || 'object'}]`
  }

  const safe = {}
  for (const key of ['name', 'code', 'status', 'message', 'details', 'hint']) {
    if (typeof value[key] === 'string' || typeof value[key] === 'number') {
      safe[key] = value[key]
    }
  }

  return Object.keys(safe).length ? safe : '[object]'
}

function isConsoleDebugEnabled() {
  try {
    return window.BOARDSPORTS_DEBUG === true
      || window.localStorage.getItem('boardsports.debug') === 'true'
  } catch (error) {
    return false
  }
}

function installConsoleGuard() {
  if (typeof window === 'undefined' || window[CONSOLE_GUARD_KEY]) return

  const nativeConsole = {
    log: console.log.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    table: console.table?.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  }

  Object.defineProperty(window, CONSOLE_GUARD_KEY, {
    value: true,
    configurable: false
  })

  for (const method of ['log', 'debug', 'info', 'table']) {
    if (!nativeConsole[method]) continue
    console[method] = (...args) => {
      if (isConsoleDebugEnabled()) nativeConsole[method](...args)
    }
  }

  for (const method of ['warn', 'error']) {
    console[method] = (...args) => {
      if (isConsoleDebugEnabled()) {
        nativeConsole[method](...args)
        return
      }

      nativeConsole[method](...args.map(getSafeConsoleArg))
    }
  }
}

installConsoleGuard()

const missingSupabaseConfig = !SUPABASE_URL || !SUPABASE_ANON_KEY

export const supabaseConfigError = missingSupabaseConfig
  ? 'Supabase não está configurado. Preenche SUPABASE_URL e SUPABASE_ANON_KEY no ficheiro env.js.'
  : ''

function createMissingSupabaseClient() {
  return new Proxy({}, {
    get() {
      throw new Error(supabaseConfigError)
    }
  })
}

export const supabase = missingSupabaseConfig
  ? createMissingSupabaseClient()
  : createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )






