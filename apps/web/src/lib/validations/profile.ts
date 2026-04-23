import { z } from 'zod'

export const accountProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'O username deve ter pelo menos 3 caracteres.')
    .max(24, 'O username deve ter no maximo 24 caracteres.')
    .regex(/^[a-z0-9-_]+$/i, 'Usa apenas letras, numeros, hifen ou underscore.'),
  fullName: z.string().trim().min(2, 'Indica um nome valido.'),
  bio: z
    .string()
    .trim()
    .max(280, 'A bio nao pode exceder 280 caracteres.')
    .optional()
    .or(z.literal('')),
  locationLabel: z
    .string()
    .trim()
    .max(120, 'A localizacao nao pode exceder 120 caracteres.')
    .optional()
    .or(z.literal(''))
})
