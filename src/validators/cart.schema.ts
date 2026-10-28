import { z } from "zod"
import { MAX_CART_QUANTITY } from "../models/cart.model.js"

export const productIdSchema = z
  .string({ error: "Product ID is required" })
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid product id")

const quantitySchema = z
  .number({ error: "Quantity must be a number" })
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(MAX_CART_QUANTITY, `You can order at most ${MAX_CART_QUANTITY} of one item`)

export const addToCartSchema = z.object({
  productId: productIdSchema,
  quantity: quantitySchema.default(1),
})

export const updateCartItemSchema = z.object({
  productId: productIdSchema,
  quantity: quantitySchema,
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>