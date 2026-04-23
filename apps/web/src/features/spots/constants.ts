import type { SpotVisibility } from '@/types/domain'

export const spotDifficultyValues = [
  'beginner',
  'intermediate',
  'advanced',
  'expert'
] as const

export type SpotDifficultyValue = (typeof spotDifficultyValues)[number]

export const spotDifficultyOptions: Array<{ value: SpotDifficultyValue; label: string }> = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avancado' },
  { value: 'expert', label: 'Expert' }
]

export const spotVisibilityOptions: Array<{ value: SpotVisibility; label: string }> = [
  { value: 'public', label: 'Publico' },
  { value: 'sensitive', label: 'Aproximado / sensivel' },
  { value: 'private', label: 'Privado' }
]

const difficultyLabelMap = new Map(spotDifficultyOptions.map((item) => [item.value, item.label]))
const visibilityLabelMap = new Map(spotVisibilityOptions.map((item) => [item.value, item.label]))

export function getSpotDifficultyLabel(value: string) {
  return difficultyLabelMap.get(value as SpotDifficultyValue) ?? value
}

export function getSpotVisibilityLabel(value: SpotVisibility) {
  return visibilityLabelMap.get(value) ?? value
}
