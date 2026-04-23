import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CurrentUser = {
  id: string
  email: string | undefined
  profile: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email,
    profile: profile ?? null
  }
})

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return user
}
