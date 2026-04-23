import { z } from 'zod'

import {
  productCategoryValues,
  productConditionValues,
  productStatusValues
} from '@/features/marketplace/constants'

export const productFormSchema = z.object({
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
  category: z.enum(productCategoryValues, {
    message: 'Escolhe uma categoria valida.'
  }),
  condition: z.enum(productConditionValues, {
    message: 'Escolhe o estado do material.'
  }),
  priceEuros: z.coerce
    .number({
      invalid_type_error: 'Indica um preco valido.'
    })
    .min(0, 'O preco nao pode ser negativo.')
    .max(50000, 'O preco excede o limite do MVP.'),
  locationLabel: z
    .string()
    .trim()
    .min(2, 'Indica a localizacao do anuncio.')
    .max(120, 'A localizacao nao pode exceder 120 caracteres.'),
  status: z.enum(productStatusValues, {
    message: 'Escolhe um estado valido para o anuncio.'
  })
})
