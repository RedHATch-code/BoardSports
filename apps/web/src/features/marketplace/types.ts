import type { ProductStatus } from '@/types/domain'

export type SportOption = {
  id: string
  slug: string
  name: string
}

export type ProductImageAsset = {
  id: string
  storagePath: string
  publicUrl: string
  sortOrder: number
}

export type ProductSellerSummary = {
  id: string
  username: string | null
  fullName: string | null
  avatarUrl: string | null
  locationLabel: string | null
}

export type ProductListItem = {
  id: string
  slug: string
  title: string
  description: string
  category: string
  condition: string
  priceCents: number
  currency: string
  locationLabel: string
  status: ProductStatus
  createdAt: string
  updatedAt: string
  sport: SportOption | null
  seller: ProductSellerSummary | null
  coverImageUrl: string | null
  images: ProductImageAsset[]
  isFavorite: boolean
  isOwner: boolean
}

export type ProductDetail = ProductListItem & {
  canEdit: boolean
}

export type ProductFormValues = {
  productId?: string
  sportId: string
  title: string
  description: string
  category: string
  condition: string
  priceEuros: string
  locationLabel: string
  status: ProductStatus
  images: ProductImageAsset[]
}

export type MarketplaceFilterValues = {
  sport: string
  category: string
  location: string
  minPrice: string
  maxPrice: string
}

export type UploadedImagePayload = {
  path: string
  publicUrl: string
}
