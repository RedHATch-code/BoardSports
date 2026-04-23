import type { ProductStatus } from '@/types/domain'

export const productCategoryValues = [
  'boards',
  'components',
  'apparel',
  'footwear',
  'protection',
  'accessories'
] as const

export type ProductCategoryValue = (typeof productCategoryValues)[number]

export const productCategories: Array<{ value: ProductCategoryValue; label: string }> = [
  { value: 'boards', label: 'Pranchas' },
  { value: 'components', label: 'Componentes' },
  { value: 'apparel', label: 'Vestuario' },
  { value: 'footwear', label: 'Calcado' },
  { value: 'protection', label: 'Protecao' },
  { value: 'accessories', label: 'Acessorios' }
]

export const productConditionValues = [
  'new',
  'like-new',
  'good',
  'used',
  'needs-repair'
] as const

export type ProductConditionValue = (typeof productConditionValues)[number]

export const productConditions: Array<{ value: ProductConditionValue; label: string }> = [
  { value: 'new', label: 'Novo' },
  { value: 'like-new', label: 'Como novo' },
  { value: 'good', label: 'Bom estado' },
  { value: 'used', label: 'Usado' },
  { value: 'needs-repair', label: 'Precisa de reparacao' }
]

export const productStatusValues = ['draft', 'active', 'sold', 'archived'] as const

export const productStatusOptions: Array<{ value: ProductStatus; label: string }> = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
  { value: 'sold', label: 'Vendido' },
  { value: 'archived', label: 'Arquivado' }
]

const categoryLabelMap = new Map(productCategories.map((item) => [item.value, item.label]))
const conditionLabelMap = new Map(productConditions.map((item) => [item.value, item.label]))
const statusLabelMap = new Map(productStatusOptions.map((item) => [item.value, item.label]))

export function getProductCategoryLabel(value: string) {
  return categoryLabelMap.get(value as ProductCategoryValue) ?? value
}

export function getProductConditionLabel(value: string) {
  return conditionLabelMap.get(value as ProductConditionValue) ?? value
}

export function getProductStatusLabel(value: ProductStatus) {
  return statusLabelMap.get(value) ?? value
}
