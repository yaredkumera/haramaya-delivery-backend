import { z } from "zod"
import { categories, markets } from "../models/product.model.js"
import { text } from "./common.js"


const priceSchema = text("Price")
  .trim()
  .min(1, "Price is required")
  .transform((val) => Number(val))
  .pipe(
    z
      .number()
      .int("Price must be a whole number")
      .min(0, "Price cannot be negative")
  )
export const createProductSchema = z.object({
  name: text("Name")
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
  description: text("Description")
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
  price: priceSchema,
  category: z.enum(categories, { error: "Choose a valid category" }),
  market: z.enum(markets, { error: "Choose a valid market" }),
  badge: z.string().trim().max(24, "Badge must be at most 24 characters").optional(),
  available: z.stringbool().optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const listQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(60)
    .transform((value) => value || undefined)
    .optional(),
  category: z.enum(categories).optional(),
  market: z.enum(markets).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ListQuery = z.infer<typeof listQuerySchema>