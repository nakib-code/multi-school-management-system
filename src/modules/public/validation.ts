// src/modules/public/validation.ts
import { z } from 'zod'

export const schoolResolveSchema = z.object({
  query: z.object({
    identifier: z.string().min(1, 'identifier required'),
  }),
})

export const contactFormSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    subject: z.string().max(200).optional(),
    message: z.string().min(5).max(2000),
  }),
})