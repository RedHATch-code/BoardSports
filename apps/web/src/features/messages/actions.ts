'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { messageSchema } from '@/lib/validations/message'
import { buildThreadKey } from '@/features/messages/queries'

export type MessageActionState = {
  error?: string
  success?: string
  redirectTo?: string
}

export async function startConversationAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const parsed = messageSchema.safeParse({
    body: formData.get('body')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Escreve uma mensagem valida.' }
  }

  const productId = String(formData.get('productId') || '')
  if (!productId) {
    return { error: 'Anuncio invalido.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, slug, seller_id')
    .eq('id', productId)
    .maybeSingle()

  if (!product) {
    return { error: 'Nao foi possivel encontrar o anuncio.' }
  }

  if (product.seller_id === user.id) {
    return { error: 'Nao podes iniciar conversa contigo proprio.' }
  }

  const { error } = await supabase.from('messages').insert({
    product_id: product.id,
    buyer_id: user.id,
    seller_id: product.seller_id,
    sender_id: user.id,
    recipient_id: product.seller_id,
    body: parsed.data.body
  })

  if (error) {
    return { error: error.message }
  }

  const threadKey = buildThreadKey(product.id, user.id, product.seller_id)

  revalidatePath('/inbox')
  revalidatePath(`/produtos/${product.slug}`)

  return {
    success: 'Mensagem enviada.',
    redirectTo: `/inbox?thread=${encodeURIComponent(threadKey)}`
  }
}

export async function sendThreadReplyAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const parsed = messageSchema.safeParse({
    body: formData.get('body')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Escreve uma mensagem valida.' }
  }

  const productId = String(formData.get('productId') || '')
  const buyerId = String(formData.get('buyerId') || '')
  const sellerId = String(formData.get('sellerId') || '')

  if (!productId || !buyerId || !sellerId) {
    return { error: 'Conversa invalida.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  if (![buyerId, sellerId].includes(user.id)) {
    return { error: 'Nao tens permissao para responder nesta conversa.' }
  }

  const recipientId = user.id === buyerId ? sellerId : buyerId

  const { error } = await supabase.from('messages').insert({
    product_id: productId,
    buyer_id: buyerId,
    seller_id: sellerId,
    sender_id: user.id,
    recipient_id: recipientId,
    body: parsed.data.body
  })

  if (error) {
    return { error: error.message }
  }

  const threadKey = buildThreadKey(productId, buyerId, sellerId)

  revalidatePath('/inbox')

  return {
    success: 'Resposta enviada.',
    redirectTo: `/inbox?thread=${encodeURIComponent(threadKey)}`
  }
}
