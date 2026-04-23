import { z } from 'zod'

export const authSchema = z.object({
  email: z.string().trim().email('Introduz um email valido.'),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres.')
})

export const profileSchema = authSchema.extend({
  username: z
    .string()
    .trim()
    .min(3, 'O username deve ter pelo menos 3 caracteres.')
    .max(24, 'O username deve ter no maximo 24 caracteres.')
    .regex(/^[a-z0-9-_]+$/i, 'Usa apenas letras, numeros, hifen ou underscore.'),
  fullName: z.string().trim().min(2, 'Indica pelo menos o primeiro nome.')
})
