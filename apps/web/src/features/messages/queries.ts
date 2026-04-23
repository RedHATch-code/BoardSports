import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { InboxMessage, InboxThreadDetail, InboxThreadSummary } from '@/features/messages/types'

type MessageRow = Database['public']['Tables']['messages']['Row']
type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'username' | 'full_name' | 'avatar_url'
>
type ProductRow = Pick<Database['public']['Tables']['products']['Row'], 'id' | 'title' | 'slug'>

export function buildThreadKey(productId: string, buyerId: string, sellerId: string) {
  return `${productId}__${buyerId}__${sellerId}`
}

export function parseThreadKey(threadKey: string) {
  const [productId, buyerId, sellerId] = threadKey.split('__')

  if (!productId || !buyerId || !sellerId) {
    return null
  }

  return { productId, buyerId, sellerId }
}

async function loadProfilesMap(profileIds: string[]) {
  const supabase = await createSupabaseServerClient()

  if (!profileIds.length) {
    return new Map<string, ProfileRow>()
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', profileIds)

  return new Map(((data || []) as ProfileRow[]).map((profile) => [profile.id, profile]))
}

async function loadProductsMap(productIds: string[]) {
  const supabase = await createSupabaseServerClient()

  if (!productIds.length) {
    return new Map<string, ProductRow>()
  }

  const { data } = await supabase
    .from('products')
    .select('id, title, slug')
    .in('id', productIds)

  return new Map(((data || []) as ProductRow[]).map((product) => [product.id, product]))
}

export async function listInboxThreads(currentUserId: string): Promise<InboxThreadSummary[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('messages')
    .select(
      'id, product_id, buyer_id, seller_id, sender_id, recipient_id, body, read_at, created_at'
    )
    .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })

  const rows = (data || []) as MessageRow[]
  if (!rows.length) {
    return []
  }

  const productsMap = await loadProductsMap([...new Set(rows.map((row) => row.product_id))])
  const profileIds = new Set<string>()
  rows.forEach((row) => {
    profileIds.add(row.buyer_id)
    profileIds.add(row.seller_id)
  })
  const profilesMap = await loadProfilesMap([...profileIds])

  const threadMap = new Map<string, InboxThreadSummary>()

  rows.forEach((row) => {
    const threadKey = buildThreadKey(row.product_id, row.buyer_id, row.seller_id)
    const counterpartId = row.buyer_id === currentUserId ? row.seller_id : row.buyer_id
    const counterpart = profilesMap.get(counterpartId)
    const product = productsMap.get(row.product_id)
    const existing = threadMap.get(threadKey)

    if (!existing) {
      threadMap.set(threadKey, {
        threadKey,
        productId: row.product_id,
        productSlug: product?.slug ?? null,
        productTitle: product?.title ?? 'Anuncio removido',
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        counterpart: counterpart
          ? {
              username: counterpart.username,
              fullName: counterpart.full_name,
              avatarUrl: counterpart.avatar_url
            }
          : null,
        lastBody: row.body,
        lastMessageAt: row.created_at,
        unreadCount: row.recipient_id === currentUserId && !row.read_at ? 1 : 0
      })
      return
    }

    if (row.recipient_id === currentUserId && !row.read_at) {
      existing.unreadCount += 1
    }
  })

  return Array.from(threadMap.values()).sort(
    (left, right) =>
      new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
  )
}

export async function getInboxThread(
  currentUserId: string,
  threadKey: string
): Promise<InboxThreadDetail | null> {
  const parsed = parseThreadKey(threadKey)

  if (!parsed) {
    return null
  }

  if (![parsed.buyerId, parsed.sellerId].includes(currentUserId)) {
    return null
  }

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('messages')
    .select(
      'id, product_id, buyer_id, seller_id, sender_id, recipient_id, body, read_at, created_at'
    )
    .eq('product_id', parsed.productId)
    .eq('buyer_id', parsed.buyerId)
    .eq('seller_id', parsed.sellerId)
    .order('created_at', { ascending: true })

  const rows = (data || []) as MessageRow[]
  if (!rows.length) {
    return null
  }

  const [productsMap, profilesMap] = await Promise.all([
    loadProductsMap([parsed.productId]),
    loadProfilesMap([parsed.buyerId, parsed.sellerId])
  ])

  await supabase
    .from('messages')
    .update({
      read_at: new Date().toISOString()
    })
    .eq('product_id', parsed.productId)
    .eq('buyer_id', parsed.buyerId)
    .eq('seller_id', parsed.sellerId)
    .eq('recipient_id', currentUserId)
    .is('read_at', null)

  const counterpartId = parsed.buyerId === currentUserId ? parsed.sellerId : parsed.buyerId
  const counterpart = profilesMap.get(counterpartId)
  const product = productsMap.get(parsed.productId)

  return {
    threadKey,
    productId: parsed.productId,
    productSlug: product?.slug ?? null,
    productTitle: product?.title ?? 'Anuncio removido',
    buyerId: parsed.buyerId,
    sellerId: parsed.sellerId,
    counterpart: counterpart
      ? {
          username: counterpart.username,
          fullName: counterpart.full_name,
          avatarUrl: counterpart.avatar_url
        }
      : null,
    messages: rows.map<InboxMessage>((row) => {
      const sender = profilesMap.get(row.sender_id)

      return {
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        isOwn: row.sender_id === currentUserId,
        sender: sender
          ? {
              id: sender.id,
              username: sender.username,
              fullName: sender.full_name,
              avatarUrl: sender.avatar_url
            }
          : null
      }
    })
  }
}
