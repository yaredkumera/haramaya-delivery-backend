import { z } from "zod"
import { text } from "./common.js"
import { orderStatuses, paymentStatuses } from "../models/order.model.js"

const transactionId = text("Transaction ID")
  .trim()
  .toUpperCase()
  .regex(/^(FT[A-Z0-9]{10}|[A-Z0-9]{10})$/, "Enter the transaction ID exactly as shown on your receipt")

const payerName = text("Payer name").trim().min(2, "Enter the name on your Telebirr or CBE Birr account").max(80)

export const checkoutSchema = z.discriminatedUnion("paymentMethod", [
  z.object({ paymentMethod: z.literal("cod") }),
  z.object({ paymentMethod: z.enum(["telebirr", "cbe"]), transactionId, payerName }),
])

export const rejectSchema = z.object({
  reason: text("Reason").trim().min(3, "Write a short reason").max(200),
})

export const adminOrderQuerySchema = z.object({
  paymentStatus: z.enum(paymentStatuses).optional(),
  status: z.enum(orderStatuses).optional(),
  search: z.string().trim().max(40).transform((value) => value.toUpperCase() || undefined).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export const pickupCodeSchema = z.string().trim().toUpperCase().regex(/^[A-HJKMNP-Z2-9]{6}$/, "Invalid pickup code")
export type RejectInput = z.infer<typeof rejectSchema>
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>