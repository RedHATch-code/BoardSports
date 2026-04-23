'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { productFormSchema } from '@/lib/validations/product'
import type { UploadedImagePayload } from '@/features/marketplace/types'

export type ProductActionState = {
  error?: string
  success?: string
  redirectTo?: string
}

function buildProductSlug(title: string) {
  const baseSlug = slugify(title) || 'produto'
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

async function replaceProductImages(productId: string, uploadedImages: UploadedImagePayload[]) {
  const supabase = await createSupabaseServerClient()

  const { data: existingImages, error: loadError } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)

  if (loadError) {
    return { error: loadError.message }
  }

  const storagePaths = (existingImages || [])
    .map((item) => item.storage_path)
    .filter((value): value is string => Boolean(value))

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage
      .from('product-images')
      .remove(storagePaths)

    if (storageError) {
      return { error: storageError.message }
    }
  }

  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (!uploadedImages.length) {
    return {}
  }

  const { error: insertError } = await supabase.from('product_images').insert(
    uploadedImages.map((image, index) => ({
      product_id: productId,
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

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const parsed = productFormSchema.safeParse({
    sportId: formData.get('sportId'),
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    condition: formData.get('condition'),
    priceEuros: formData.get('priceEuros'),
    locationLabel: formData.get('locationLabel'),
    status: formData.get('status')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Nao foi possivel validar o anuncio.' }
  }

  const uploadedImages = parseUploadedImages(formData)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  const slug = buildProductSlug(parsed.data.title)

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      seller_id: user.id,
      sport_id: parsed.data.sportId,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      category: parsed.data.category,
      condition: parsed.data.condition,
      price_cents: Math.round(parsed.data.priceEuros * 100),
      currency: 'EUR',
      location_label: parsed.data.locationLabel,
      status: parsed.data.status
    })
    .select('id, slug')
    .single()

  if (error) {
    return { error: error.message }
  }

  if (uploadedImages.length) {
    const { error: imageError } = await supabase.from('product_images').insert(
      uploadedImages.map((image, index) => ({
        product_id: product.id,
        storage_path: image.path,
        public_url: image.publicUrl,
        sort_order: index
      }))
    )

    if (imageError) {
      return { error: imageError.message }
    }
  }

  revalidatePath('/produtos')
  revalidatePath('/painel')
  revalidatePath('/favoritos')

  return {
    success: 'Anuncio criado com sucesso.',
    redirectTo: `/produtos/${product.slug}`
  }
}

export async function updateProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const productId = String(formData.get('productId') || '')

  if (!productId) {
    return { error: 'Produto invalido.' }
  }

  const parsed = productFormSchema.safeParse({
    sportId: formData.get('sportId'),
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    condition: formData.get('condition'),
    priceEuros: formData.get('priceEuros'),
    locationLabel: formData.get('locationLabel'),
    status: formData.get('status')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Nao foi possivel validar o anuncio.' }
  }

  const uploadedImages = parseUploadedImages(formData)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  const { data: existingProduct, error: loadError } = await supabase
    .from('products')
    .select('id, seller_id, slug, title')
    .eq('id', productId)
    .eq('seller_id', user.id)
    .maybeSingle()

  if (loadError) {
    return { error: loadError.message }
  }

  if (!existingProduct) {
    return { error: 'Nao tens permissao para editar este anuncio.' }
  }

  const nextSlug =
    existingProduct.title.trim().toLowerCase() === parsed.data.title.trim().toLowerCase()
      ? existingProduct.slug
      : buildProductSlug(parsed.data.title)

  const { error } = await supabase
    .from('products')
    .update({
      sport_id: parsed.data.sportId,
      title: parsed.data.title,
      slug: nextSlug,
      description: parsed.data.description,
      category: parsed.data.category,
      condition: parsed.data.condition,
      price_cents: Math.round(parsed.data.priceEuros * 100),
      location_label: parsed.data.locationLabel,
      status: parsed.data.status
    })
    .eq('id', productId)
    .eq('seller_id', user.id)

  if (error) {
    return { error: error.message }
  }

  if (uploadedImages.length) {
    const replacementResult = await replaceProductImages(productId, uploadedImages)
    if (replacementResult.error) {
      return replacementResult
    }
  }

  revalidatePath('/produtos')
  revalidatePath('/painel')
  revalidatePath('/favoritos')
  revalidatePath(`/produtos/${existingProduct.slug}`)
  revalidatePath(`/produtos/${nextSlug}`)

  return {
    success: 'Anuncio atualizado com sucesso.',
    redirectTo: `/produtos/${nextSlug}`
  }
}

export async function deleteProductAction(formData: FormData) {
  const productId = String(formData.get('productId') || '')

  if (!productId) {
    redirect('/painel')
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, slug')
    .eq('id', productId)
    .eq('seller_id', user.id)
    .maybeSingle()

  if (!product) {
    redirect('/painel')
  }

  const { data: existingImages } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)

  const storagePaths = (existingImages || [])
    .map((item) => item.storage_path)
    .filter((value): value is string => Boolean(value))

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage
      .from('product-images')
      .remove(storagePaths)

    if (storageError) {
      redirect(`/produtos/${product.slug}`)
    }
  }

  await supabase.from('products').delete().eq('id', productId).eq('seller_id', user.id)

  revalidatePath('/produtos')
  revalidatePath('/painel')
  revalidatePath('/favoritos')
  revalidatePath(`/produtos/${product.slug}`)

  redirect('/painel')
}

export async function toggleProductFavoriteAction(formData: FormData) {
  const productId = String(formData.get('productId') || '')
  const path = String(formData.get('path') || '/produtos')

  if (!productId) {
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
    .eq('target_type', 'product')
    .eq('product_id', productId)
    .maybeSingle()

  if (existingFavorite) {
    await supabase.from('favorites').delete().eq('id', existingFavorite.id)
  } else {
    await supabase.from('favorites').insert({
      user_id: user.id,
      target_type: 'product',
      product_id: productId
    })
  }

  revalidatePath('/produtos')
  revalidatePath('/favoritos')
  revalidatePath('/painel')
  revalidatePath(path)
}
