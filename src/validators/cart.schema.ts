import { z } from "zod"

export const addToCartSchema = z.object({
    productId: z.string({ error: "Product ID is required" }),
    quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").default(1),
})

export const updateCartItemSchema = z.object({
    productId: z.string({ error: "Product ID is required" }),
    quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  
})

// Schema if you choose to send productId in the body for removal
export const removeFromCartSchema = z.object({
    productId: z.string({ error: "Product ID is required" }),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>