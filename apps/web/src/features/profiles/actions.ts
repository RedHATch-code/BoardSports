'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { accountProfileSchema } from '@/lib/validations/profile'

export type ProfileActionState = {
  error?: string
  success?: string
}

export async function updateOwnProfileAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const parsed = accountProfileSchema.safeParse({
    username: formData.get('username'),
    fullName: formData.get('fullName'),
    bio: formData.get('bio'),
    locationLabel: formData.get('locationLabel')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados de perfil invalidos.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  const selectedSportIds = formData
    .getAll('sports')
    .map((value) => String(value))
    .filter(Boolean)
  const avatarUrl = String(formData.get('avatarUrl') || '').trim()

  const { error } = await supabase
    .from('profiles')
    .update({
      username: parsed.data.username,
      full_name: parsed.data.fullName,
      bio: parsed.data.bio || null,
      location_label: parsed.data.locationLabel || null,
      avatar_url: avatarUrl || null
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  const { error: deleteError } = await supabase
    .from('user_sports')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (selectedSportIds.length) {
    const { error: insertError } = await supabase.from('user_sports').insert(
      selectedSportIds.map((sportId) => ({
        user_id: user.id,
        sport_id: sportId
      }))
    )

    if (insertError) {
      return { error: insertError.message }
    }
  }

  revalidatePath('/conta')
  revalidatePath('/painel')
  revalidatePath(`/perfil/${parsed.data.username}`)
  return { success: 'Perfil atualizado com sucesso.' }
}
