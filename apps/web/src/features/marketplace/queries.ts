import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type {
  MarketplaceFilterValues,
  ProductDetail,
  ProductFormValues,
  ProductImageAsset,
  ProductListItem,
  ProductSellerSummary,
  SportOption
} from '@/features/marketplace/types'
import { listSports } from '@/features/profiles/queries'

type ProductRow = Database['public']['Tables']['products']['Row']
type ProductImageRow = Database['public']['Tables']['product_images']['Row']
type FavoriteRow = Database['public']['Tables']['favorites']['Row']
type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'username' | 'full_name' | 'avatar_url' | 'location_label'
>

export function normalizeMarketplaceFilters(
  input: Record<string, string | string[] | undefined>
): MarketplaceFilterValues {
  const takeFirst = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? ''

  return {
    sport: takeFirst(input.sport).trim(),
    category: takeFirst(input.category).trim(),
    location: takeFirst(input.location).trim(),
    minPrice: takeFirst(input.minPrice).trim(),
    maxPrice: takeFirst(input.maxPrice).trim()
  }
}

function toPriceCents(value: string) {
  if (!value) return undefined

  const normalized = Number(value.replace(',', '.'))
  if (!Number.isFinite(normalized) || normalized < 0) {
    return undefined
  }

  return Math.round(normalized * 100)
}

function formatPriceEuros(priceCents: number) {
  return (priceCents / 100).toFixed(2)
}

async function getSportIndex() {
  const sports = await listSports()
  return {
    sports,
    byId: new Map<string, SportOption>(sports.map((sport) => [sport.id, sport]))
  }
}

async function loadProfilesMap(userIds: string[]) {
  const supabase = await createSupabaseServerClient()

  if (!userIds.length) {
    return new Map<string, ProductSellerSummary>()
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, location_label')
    .in('id', userIds)

  return new Map(
    ((data || []) as ProfileRow[]).map((profile) => [
      profile.id,
      {
        id: profile.id,
        username: profile.username,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        locationLabel: profile.location_label
      }
    ])
  )
}

async function loadProductImagesMap(productIds: string[]) {
  const supabase = await createSupabaseServerClient()

  if (!productIds.length) {
    return new Map<string, ProductImageAsset[]>()
  }

  const { data } = await supabase
    .from('product_images')
    .select('id, product_id, storage_path, public_url, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true })

  const imageMap = new Map<string, ProductImageAsset[]>()

  ;((data || []) as ProductImageRow[]).forEach((image) => {
    const current = imageMap.get(image.product_id) ?? []
    current.push({
      id: image.id,
      storagePath: image.storage_path,
      publicUrl: image.public_url,
      sortOrder: image.sort_order
    })
    imageMap.set(image.product_id, current)
  })

  return imageMap
}

async function loadFavoriteSet(productIds: string[], currentUserId?: string | null) {
  const supabase = await createSupabaseServerClient()

  if (!currentUserId || !productIds.length) {
    return new Set<string>()
  }

  const { data } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', currentUserId)
    .eq('target_type', 'product')
    .in('product_id', productIds)

  return new Set(
    ((data || []) as Array<Pick<FavoriteRow, 'product_id'>>)
      .map((favorite) => favorite.product_id)
      .filter((value): value is string => Boolean(value))
  )
}

async function decorateProducts(
  rows: ProductRow[],
  currentUserId?: string | null
): Promise<ProductListItem[]> {
  if (!rows.length) {
    return []
  }

  const [{ byId: sportsById }, sellerMap, imageMap, favoriteSet] = await Promise.all([
    getSportIndex(),
    loadProfilesMap([...new Set(rows.map((row) => row.seller_id))]),
    loadProductImagesMap(rows.map((row) => row.id)),
    loadFavoriteSet(rows.map((row) => row.id), currentUserId)
  ])

  return rows.map((row) => {
    const images = imageMap.get(row.id) ?? []

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      category: row.category,
      condition: row.condition,
      priceCents: row.price_cents,
      currency: row.currency,
      locationLabel: row.location_label,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sport: sportsById.get(row.sport_id) ?? null,
      seller: sellerMap.get(row.seller_id) ?? null,
      coverImageUrl: images[0]?.publicUrl ?? null,
      images,
      isFavorite: favoriteSet.has(row.id),
      isOwner: currentUserId === row.seller_id
    }
  })
}

export async function getMarketplaceSports() {
  return listSports()
}

export async function listMarketplaceProducts(
  filters: MarketplaceFilterValues,
  currentUserId?: string | null
) {
  const supabase = await createSupabaseServerClient()
  const { sports } = await getSportIndex()

  let query = supabase
    .from('products')
    .select(
      'id, seller_id, sport_id, title, slug, description, category, condition, price_cents, currency, location_label, status, is_featured, created_at, updated_at'
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(24)

  if (filters.sport) {
    const selectedSport = sports.find((sport) => sport.slug === filters.sport)
    if (!selectedSport) {
      return []
    }
    query = query.eq('sport_id', selectedSport.id)
  }

  if (filters.category) {
    query = query.eq('category', filters.category)
  }

  if (filters.location) {
    query = query.ilike('location_label', `%${filters.location}%`)
  }

  const minPriceCents = toPriceCents(filters.minPrice)
  const maxPriceCents = toPriceCents(filters.maxPrice)

  if (typeof minPriceCents === 'number') {
    query = query.gte('price_cents', minPriceCents)
  }

  if (typeof maxPriceCents === 'number') {
    query = query.lte('price_cents', maxPriceCents)
  }

  const { data } = await query
  const rows = (data || []) as ProductRow[]

  return decorateProducts(rows, currentUserId)
}

export async function getProductBySlug(slug: string, currentUserId?: string | null): Promise<ProductDetail | null> {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('products')
    .select(
      'id, seller_id, sport_id, title, slug, description, category, condition, price_cents, currency, location_label, status, is_featured, created_at, updated_at'
    )
    .eq('slug', slug)
    .maybeSingle()

  const row = data as ProductRow | null

  if (!row) {
    return null
  }

  const [product] = await decorateProducts([row], currentUserId)

  if (!product) {
    return null
  }

  return {
    ...product,
    canEdit: product.isOwner
  }
}

export async function getEditableProductBySlug(
  slug: string,
  currentUserId: string
): Promise<ProductFormValues | null> {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('products')
    .select(
      'id, seller_id, sport_id, title, slug, description, category, condition, price_cents, currency, location_label, status, is_featured, created_at, updated_at'
    )
    .eq('slug', slug)
    .eq('seller_id', currentUserId)
    .maybeSingle()

  const row = data as ProductRow | null

  if (!row) {
    return null
  }

  const imageMap = await loadProductImagesMap([row.id])

  return {
    productId: row.id,
    sportId: row.sport_id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    priceEuros: formatPriceEuros(row.price_cents),
    locationLabel: row.location_label,
    status: row.status,
    images: imageMap.get(row.id) ?? []
  }
}

export async function listOwnedProducts(currentUserId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('products')
    .select(
      'id, seller_id, sport_id, title, slug, description, category, condition, price_cents, currency, location_label, status, is_featured, created_at, updated_at'
    )
    .eq('seller_id', currentUserId)
    .order('updated_at', { ascending: false })

  return decorateProducts((data || []) as ProductRow[], currentUserId)
}

export async function listFavoriteProducts(currentUserId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('favorites')
    .select('product_id, created_at')
    .eq('user_id', currentUserId)
    .eq('target_type', 'product')
    .order('created_at', { ascending: false })

  const favoriteRows = (data || []) as Array<Pick<FavoriteRow, 'product_id'> & { created_at: string }>
  const productIds = favoriteRows
    .map((item) => item.product_id)
    .filter((value): value is string => Boolean(value))

  if (!productIds.length) {
    return []
  }

  const { data: products } = await supabase
    .from('products')
    .select(
      'id, seller_id, sport_id, title, slug, description, category, condition, price_cents, currency, location_label, status, is_featured, created_at, updated_at'
    )
    .in('id', productIds)

  const decorated = await decorateProducts((products || []) as ProductRow[], currentUserId)
  const order = new Map(productIds.map((productId, index) => [productId, index]))

  return decorated.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
}
