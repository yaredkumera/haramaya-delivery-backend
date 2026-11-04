import { z } from "zod"

export const userQuerySchema = z.object({
  search: z.string().trim().max(60).transform((value) => value || undefined).optional(),
  filter: z.enum(["all", "students", "blocked", "admins"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type UserQuery = z.infer<typeof userQuerySchema>