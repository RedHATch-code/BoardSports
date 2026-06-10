
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/env.js'

const missingSupabaseConfig = !SUPABASE_URL || !SUPABASE_ANON_KEY

export const supabaseConfigError = missingSupabaseConfig
  ? 'Supabase nao esta configurado. Preenche SUPABASE_URL e SUPABASE_ANON_KEY no ficheiro env.js.'
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
