'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { spotFormSchema } from '@/lib/validations/spot'
import type { UploadedImagePayload } from '@/features/marketplace/types'

export type SpotActionState = {
  error?: string
  success?: string
  redirectTo?: string
}

function buildSpotSlug(title: string) {
  const baseSlug = slugify(title) || 'spot'
  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`
}

function parseUploadedImages(formData: FormData): UploadedImagePayload[] {
  const raw = String(formData.get('uploadedImages') || '[]')

  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item): item is UploadedImagePayload =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.path === 'string' &&
            typeof item.publicUrl === 'string'
        )
    )
  } catch {
    return []
  }
}

async function replaceSpotImages(spotId: string, uploadedImages: UploadedImagePayload[]) {
  const supabase = await createSupabaseServerClient()

  const { data: existingImages, error: loadError } = await supabase
    .from('spot_images')
    .select('storage_path')
    .eq('spot_id', spotId)

  if (loadError) {
    return { error: loadError.message }
  }

  const storagePaths = (existingImages || [])
    .map((item) => item.storage_path)
    .filter((value): value is string => Boolean(value))

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage.from('spot-images').remove(storagePaths)

    if (storageError) {
      return { error: storageError.message }
    }
  }

  const { error: deleteError } = await supabase.from('spot_images').delete().eq('spot_id', spotId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (!uploadedImages.length) {
    return {}
  }

  const { error: insertError } = await supabase.from('spot_images').insert(
    uploadedImages.map((image, index) => ({
      spot_id: spotId,
      storage_path: image.path,
      public_url: image.publicUrl,
      sort_order: index
    }))
  )

  if (insertError) {
    return { error: insertError.message }
  }

  return {}
}

export async function createSpotAction(
  _prevState: SpotActionState,
  formData: FormData
): Promise<SpotActionState> {
  const parsed = spotFormSchema.safeParse({
    sportId: formData.get('sportId'),
    title: formData.get('title'),
    description: formData.get('description'),
    visibility: formData.get('visibility'),
    difficulty: formData.get('difficulty'),
    bestTime: formData.get('bestTime'),
    safetyNotes: formData.get('safetyNotes'),
    locationLabel: formData.get('locationLabel'),
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Nao foi possivel validar o spot.' }
  }

  const uploadedImages = parseUploadedImages(formData)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  const slug = buildSpotSlug(parsed.data.title)

  const { data: spot, error } = await supabase
    .from('spots')
    .insert({
      owner_id: user.id,
      sport_id: parsed.data.sportId,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      difficulty: parsed.data.difficulty,
      best_time: parsed.data.bestTime || null,
      safety_notes: parsed.data.safetyNotes || null,
      location_label: parsed.data.locationLabel,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude
    })
    .select('id, slug')
    .single()

  if (error) {
    return { error: error.message }
  }

  if (uploadedImages.length) {
    const { error: imageError } = await supabase.from('spot_images').insert(
      uploadedImages.map((image, index) => ({
        spot_id: spot.id,
        storage_path: image.path,
        public_url: image.publicUrl,
        sort_order: index
      }))
    )

    if (imageError) {
      return { error: imageError.message }
    }
  }

  revalidatePath('/spots')
  revalidatePath('/painel')
  revalidatePath('/favoritos')

  return {
    success: 'Spot criado com sucesso.',
    redirectTo: `/spots/${spot.slug}`
  }
}

export async function updateSpotAction(
  _prevState: SpotActionState,
  formData: FormData
): Promise<SpotActionState> {
  const spotId = String(formData.get('spotId') || '')

  if (!spotId) {
    return { error: 'Spot invalido.' }
  }

  const parsed = spotFormSchema.safeParse({
    sportId: formData.get('sportId'),
    title: formData.get('title'),
    description: formData.get('description'),
    visibility: formData.get('visibility'),
    difficulty: formData.get('difficulty'),
    bestTime: formData.get('bestTime'),
    safetyNotes: formData.get('safetyNotes'),
    locationLabel: formData.get('locationLabel'),
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Nao foi possivel validar o spot.' }
  }

  const uploadedImages = parseUploadedImages(formData)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  const { data: existingSpot, error: loadError } = await supabase
    .from('spots')
    .select('id, owner_id, slug, title')
    .eq('id', spotId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (loadError) {
    return { error: loadError.message }
  }

  if (!existingSpot) {
    return { error: 'Nao tens permissao para editar este spot.' }
  }

  const nextSlug =
    existingSpot.title.trim().toLowerCase() === parsed.data.title.trim().toLowerCase()
      ? existingSpot.slug
      : buildSpotSlug(parsed.data.title)

  const { error } = await supabase
    .from('spots')
    .update({
      sport_id: parsed.data.sportId,
      title: parsed.data.title,
      slug: nextSlug,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      difficulty: parsed.data.difficulty,
      best_time: parsed.data.bestTime || null,
      safety_notes: parsed.data.safetyNotes || null,
      location_label: parsed.data.locationLabel,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude
    })
    .eq('id', spotId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: error.message }
  }

  if (uploadedImages.length) {
    const replacementResult = await replaceSpotImages(spotId, uploadedImages)
    if (replacementResult.error) {
      return replacementResult
    }
  }

  revalidatePath('/spots')
  revalidatePath('/painel')
  revalidatePath('/favoritos')
  revalidatePath(`/spots/${existingSpot.slug}`)
  revalidatePath(`/spots/${nextSlug}`)

  return {
    success: 'Spot atualizado com sucesso.',
    redirectTo: `/spots/${nextSlug}`
  }
}

export async function deleteSpotAction(formData: FormData) {
  const spotId = String(formData.get('spotId') || '')

  if (!spotId) {
    redirect('/painel')
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: spot } = await supabase
    .from('spots')
    .select('id, slug')
    .eq('id', spotId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!spot) {
    redirect('/painel')
  }

  const { data: existingImages } = await supabase
    .from('spot_images')
    .select('storage_path')
    .eq('spot_id', spotId)

  const storagePaths = (existingImages || [])
    .map((item) => item.storage_path)
    .filter((value): value is string => Boolean(value))

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage.from('spot-images').remove(storagePaths)

    if (storageError) {
      redirect(`/spots/${spot.slug}`)
    }
  }

  await supabase.from('spots').delete().eq('id', spotId).eq('owner_id', user.id)

  revalidatePath('/spots')
  revalidatePath('/painel')
  revalidatePath('/favoritos')
  revalidatePath(`/spots/${spot.slug}`)

  redirect('/painel')
}

export async function toggleSpotFavoriteAction(formData: FormData) {
  const spotId = String(formData.get('spotId') || '')
  const path = String(formData.get('path') || '/spots')

  if (!spotId) {
    return
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', 'spot')
    .eq('spot_id', spotId)
    .maybeSingle()

  if (existingFavorite) {
    await supabase.from('favorites').delete().eq('id', existingFavorite.id)
  } else {
    await supabase.from('favorites').insert({
      user_id: user.id,
      target_type: 'spot',
      spot_id: spotId
    })
  }

  revalidatePath('/spots')
  revalidatePath('/favoritos')
  revalidatePath('/painel')
  revalidatePath(path)
}
