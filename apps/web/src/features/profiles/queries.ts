import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getProfileByUsername(username: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio, location_label')
    .eq('username', username)
    .maybeSingle()

  return data
}

export async function getOwnProfile(userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio, location_label')
    .eq('id', userId)
    .maybeSingle()

  return data
}

export async function listSports() {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('sports')
    .select('id, slug, name')
    .order('name')

  return data || []
}

export async function getOwnSportIds(userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('user_sports')
    .select('sport_id')
    .eq('user_id', userId)

  return (data || []).map((item) => item.sport_id)
}
