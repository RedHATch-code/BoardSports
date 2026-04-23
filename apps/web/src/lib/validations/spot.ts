import { z } from 'zod'

import { spotDifficultyValues } from '@/features/spots/constants'

export const spotFormSchema = z.object({
  sportId: z.string().uuid('Escolhe uma modalidade.'),
  title: z
    .string()
    .trim()
    .min(4, 'O titulo deve ter pelo menos 4 caracteres.')
    .max(90, 'O titulo nao pode exceder 90 caracteres.'),
  description: z
    .string()
    .trim()
    .min(20, 'A descricao deve ter pelo menos 20 caracteres.')
    .max(2000, 'A descricao nao pode exceder 2000 caracteres.'),
  visibility: z.enum(['public', 'sensitive', 'private'], {
    message: 'Escolhe um nivel de visibilidade valido.'
  }),
  difficulty: z.enum(spotDifficultyValues, {
    message: 'Escolhe a dificuldade do spot.'
  }),
  bestTime: z
    .string()
    .trim()
    .max(120, 'A indicacao de melhor horario nao pode exceder 120 caracteres.')
    .optional()
    .or(z.literal('')),
  safetyNotes: z
    .string()
    .trim()
    .max(500, 'As notas de seguranca nao podem exceder 500 caracteres.')
    .optional()
    .or(z.literal('')),
  locationLabel: z
    .string()
    .trim()
    .min(2, 'Indica a localizacao do spot.')
    .max(120, 'A localizacao nao pode exceder 120 caracteres.'),
  latitude: z.coerce
    .number({
      invalid_type_error: 'Indica uma latitude valida.'
    })
    .gte(-90, 'Latitude invalida.')
    .lte(90, 'Latitude invalida.'),
  longitude: z.coerce
    .number({
      invalid_type_error: 'Indica uma longitude valida.'
    })
    .gte(-180, 'Longitude invalida.')
    .lte(180, 'Longitude invalida.')
})
