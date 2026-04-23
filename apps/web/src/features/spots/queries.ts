import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { SportOption } from '@/features/marketplace/types'
import type {
  SpotDetail,
  SpotFilterValues,
  SpotFormValues,
  SpotImageAsset,
  SpotListItem
} from '@/features/spots/types'
import { listSports } from '@/features/profiles/queries'

type SpotRow = Database['public']['Tables']['spots']['Row']
type SpotImageRow = Database['public']['Tables']['spot_images']['Row']
type FavoriteRow = Database['public']['Tables']['favorites']['Row']
type SpotMapPointRow = Database['public']['Views']['spot_map_points']['Row']
type SpotPublicDetailRow = Database['public']['Views']['spot_public_details']['Row']

export function normalizeSpotFilters(
  input: Record<string, string | string[] | undefined>
): SpotFilterValues {
  const takeFirst = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? ''

  return {
    sport: takeFirst(input.sport).trim()
  }
}

async function getSportIndex() {
  const sports = await listSports()
  return {
    sports,
    byId: new Map<string, SportOption>(sports.map((sport) => [sport.id, sport]))
  }
}

async function loadSpotImagesMap(spotIds: string[]) {
  const supabase = await createSupabaseServerClient()

  if (!spotIds.length) {
    return new Map<string, SpotImageAsset[]>()
  }

  const { data } = await supabase
    .from('spot_images')
    .select('id, spot_id, storage_path, public_url, sort_order')
    .in('spot_id', spotIds)
    .order('sort_order', { ascending: true })

  const imageMap = new Map<string, SpotImageAsset[]>()

  ;((data || []) as SpotImageRow[]).forEach((image) => {
    const current = imageMap.get(image.spot_id) ?? []
    current.push({
      id: image.id,
      storagePath: image.storage_path,
      publicUrl: image.public_url,
      sortOrder: image.sort_order
    })
    imageMap.set(image.spot_id, current)
  })

  return imageMap
}

async function loadSpotFavoriteSet(spotIds: string[], currentUserId?: string | null) {
  const supabase = await createSupabaseServerClient()

  if (!currentUserId || !spotIds.length) {
    return new Set<string>()
  }

  const { data } = await supabase
    .from('favorites')
    .select('spot_id')
    .eq('user_id', currentUserId)
    .eq('target_type', 'spot')
    .in('spot_id', spotIds)

  return new Set(
    ((data || []) as Array<Pick<FavoriteRow, 'spot_id'>>)
      .map((favorite) => favorite.spot_id)
      .filter((value): value is string => Boolean(value))
  )
}

async function decorateOwnedSpots(rows: SpotRow[], currentUserId: string) {
  if (!rows.length) {
    return []
  }

  const [{ byId: sportsById }, imageMap, favoriteSet] = await Promise.all([
    getSportIndex(),
    loadSpotImagesMap(rows.map((row) => row.id)),
    loadSpotFavoriteSet(rows.map((row) => row.id), currentUserId)
  ])

  return rows.map<SpotListItem>((row) => {
    const images = imageMap.get(row.id) ?? []

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      visibility: row.visibility,
      difficulty: row.difficulty,
      bestTime: row.best_time,
      safetyNotes: row.safety_notes,
      locationLabel: row.location_label,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      sport: sportsById.get(row.sport_id) ?? null,
      owner: {
        username: null,
        fullName: 'Teu spot'
      },
      coverImageUrl: images[0]?.publicUrl ?? null,
      images,
      isFavorite: favoriteSet.has(row.id),
      isOwner: true
    }
  })
}

function mapPublicRows(rows: SpotMapPointRow[], favoriteSet: Set<string>) {
  return rows.map<SpotListItem>((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    difficulty: row.difficulty,
    bestTime: row.best_time,
    safetyNotes: null,
    locationLabel: row.location_label,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    sport: row.sport_slug
      ? {
          id: '',
          slug: row.sport_slug,
          name: row.sport_name
        }
      : null,
    owner: {
      username: row.owner_username,
      fullName: row.owner_name
    },
    coverImageUrl: row.cover_image_url,
    images: [],
    isFavorite: favoriteSet.has(row.id),
    isOwner: false
  }))
}

async function loadSpotItems(
  params: {
    currentUserId?: string | null
    sportSlug?: string
    spotIds?: string[]
  } = {}
) {
  const supabase = await createSupabaseServerClient()
  const merged = new Map<string, SpotListItem>()

  let publicQuery = supabase.from('spot_map_points').select('*')

  if (params.sportSlug) {
    publicQuery = publicQuery.eq('sport_slug', params.sportSlug)
  }

  if (params.spotIds?.length) {
    publicQuery = publicQuery.in('id', params.spotIds)
  }

  const { data: publicRows } = await publicQuery.order('title', { ascending: true })
  const publicFavoriteSet = await loadSpotFavoriteSet(
    ((publicRows || []) as SpotMapPointRow[]).map((row) => row.id),
    params.currentUserId
  )

  mapPublicRows((publicRows || []) as SpotMapPointRow[], publicFavoriteSet).forEach((item) => {
    merged.set(item.id, item)
  })

  if (params.currentUserId) {
    const { sports } = await getSportIndex()
    let ownQuery = supabase
      .from('spots')
      .select(
        'id, owner_id, sport_id, title, slug, description, visibility, difficulty, best_time, safety_notes, location_label, latitude, longitude, created_at, updated_at'
      )
      .eq('owner_id', params.currentUserId)

    if (params.sportSlug) {
      const selectedSport = sports.find((sport) => sport.slug === params.sportSlug)
      if (!selectedSport) {
        return Array.from(merged.values())
      }
      ownQuery = ownQuery.eq('sport_id', selectedSport.id)
    }

    if (params.spotIds?.length) {
      ownQuery = ownQuery.in('id', params.spotIds)
    }

    const { data: ownRows } = await ownQuery.order('updated_at', { ascending: false })

    ;(await decorateOwnedSpots((ownRows || []) as SpotRow[], params.currentUserId)).forEach(
      (item) => {
        merged.set(item.id, item)
      }
    )
  }

  const items = Array.from(merged.values())

  if (params.spotIds?.length) {
    const order = new Map(params.spotIds.map((spotId, index) => [spotId, index]))
    return items.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
  }

  return items.sort((left, right) => left.title.localeCompare(right.title, 'pt'))
}

export async function getSpotSports() {
  return listSports()
}

export async function listExploreSpots(filters: SpotFilterValues, currentUserId?: string | null) {
  return loadSpotItems({
    currentUserId,
    sportSlug: filters.sport || undefined
  })
}

export async function getSpotBySlug(slug: string, currentUserId?: string | null): Promise<SpotDetail | null> {
  const supabase = await createSupabaseServerClient()

  if (currentUserId) {
    const { data: ownSpot } = await supabase
      .from('spots')
      .select(
        'id, owner_id, sport_id, title, slug, description, visibility, difficulty, best_time, safety_notes, location_label, latitude, longitude, created_at, updated_at'
      )
      .eq('slug', slug)
      .eq('owner_id', currentUserId)
      .maybeSingle()

    if (ownSpot) {
      const [spot] = await decorateOwnedSpots([ownSpot as SpotRow], currentUserId)

      if (spot) {
        return {
          ...spot,
          canEdit: true,
          hasApproximateLocation: false
        }
      }
    }
  }

  const { data: publicSpot } = await supabase
    .from('spot_public_details')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  const row = publicSpot as SpotPublicDetailRow | null

  if (!row) {
    return null
  }

  const [imageMap, favoriteSet] = await Promise.all([
    loadSpotImagesMap([row.id]),
    loadSpotFavoriteSet([row.id], currentUserId)
  ])

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    difficulty: row.difficulty,
    bestTime: row.best_time,
    safetyNotes: row.safety_notes,
    locationLabel: row.location_label,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    sport: row.sport_slug
      ? {
          id: '',
          slug: row.sport_slug,
          name: row.sport_name
        }
      : null,
    owner: {
      username: row.owner_username,
      fullName: row.owner_name
    },
    coverImageUrl: imageMap.get(row.id)?.[0]?.publicUrl ?? null,
    images: imageMap.get(row.id) ?? [],
    isFavorite: favoriteSet.has(row.id),
    isOwner: false,
    canEdit: false,
    hasApproximateLocation: row.visibility === 'sensitive'
  }
}

export async function getEditableSpotBySlug(
  slug: string,
  currentUserId: string
): Promise<SpotFormValues | null> {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('spots')
    .select(
      'id, owner_id, sport_id, title, slug, description, visibility, difficulty, best_time, safety_notes, location_label, latitude, longitude, created_at, updated_at'
    )
    .eq('slug', slug)
    .eq('owner_id', currentUserId)
    .maybeSingle()

  const row = data as SpotRow | null

  if (!row) {
    return null
  }

  const imageMap = await loadSpotImagesMap([row.id])

  return {
    spotId: row.id,
    sportId: row.sport_id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    difficulty: row.difficulty,
    bestTime: row.best_time ?? '',
    safetyNotes: row.safety_notes ?? '',
    locationLabel: row.location_label,
    latitude: Number(row.latitude).toFixed(6),
    longitude: Number(row.longitude).toFixed(6),
    images: imageMap.get(row.id) ?? []
  }
}

export async function listOwnedSpots(currentUserId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('spots')
    .select(
      'id, owner_id, sport_id, title, slug, description, visibility, difficulty, best_time, safety_notes, location_label, latitude, longitude, created_at, updated_at'
    )
    .eq('owner_id', currentUserId)
    .order('updated_at', { ascending: false })

  return decorateOwnedSpots((data || []) as SpotRow[], currentUserId)
}

export async function listFavoriteSpots(currentUserId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('favorites')
    .select('spot_id, created_at')
    .eq('user_id', currentUserId)
    .eq('target_type', 'spot')
    .order('created_at', { ascending: false })

  const favoriteRows = (data || []) as Array<Pick<FavoriteRow, 'spot_id'> & { created_at: string }>
  const spotIds = favoriteRows
    .map((item) => item.spot_id)
    .filter((value): value is string => Boolean(value))

  if (!spotIds.length) {
    return []
  }

  return loadSpotItems({
    currentUserId,
    spotIds
  })
}
