import { z } from 'zod'

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Escreve uma mensagem.')
    .max(1200, 'A mensagem nao pode exceder 1200 caracteres.')
})
