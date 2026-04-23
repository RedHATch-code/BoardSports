import { z } from 'zod'

export const reportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Indica um motivo curto para a denuncia.')
    .max(120, 'O motivo nao pode exceder 120 caracteres.'),
  details: z
    .string()
    .trim()
    .max(600, 'Os detalhes nao podem exceder 600 caracteres.')
    .optional()
    .or(z.literal(''))
})
