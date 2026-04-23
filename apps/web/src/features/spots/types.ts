import type { SpotVisibility } from '@/types/domain'
import type { SportOption } from '@/features/marketplace/types'

export type SpotImageAsset = {
  id: string
  storagePath: string
  publicUrl: string
  sortOrder: number
}

export type SpotOwnerSummary = {
  username: string | null
  fullName: string | null
}

export type SpotListItem = {
  id: string
  slug: string
  title: string
  description: string
  visibility: SpotVisibility
  difficulty: string
  bestTime: string | null
  safetyNotes: string | null
  locationLabel: string
  latitude: number
  longitude: number
  sport: SportOption | null
  owner: SpotOwnerSummary | null
  coverImageUrl: string | null
  images: SpotImageAsset[]
  isFavorite: boolean
  isOwner: boolean
}

export type SpotDetail = SpotListItem & {
  canEdit: boolean
  hasApproximateLocation: boolean
}

export type SpotFormValues = {
  spotId?: string
  sportId: string
  title: string
  description: string
  visibility: SpotVisibility
  difficulty: string
  bestTime: string
  safetyNotes: string
  locationLabel: string
  latitude: string
  longitude: string
  images: SpotImageAsset[]
}

export type SpotFilterValues = {
  sport: string
}
