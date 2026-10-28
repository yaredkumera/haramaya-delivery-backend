import { Schema, model } from "mongoose"
import type { InferSchemaType } from "mongoose"

export const paymentMethods = ["cod", "telebirr", "cbe"] as const
export type PaymentMethod = (typeof paymentMethods)[number]

export const paymentStatuses = ["unpaid", "review", "paid", "rejected"] as const
export type PaymentStatus = (typeof paymentStatuses)[number]

export const orderStatuses = ["placed", "ready_for_pickup", "collected", "cancelled"] as const
export type OrderStatus = (typeof orderStatuses)[number]


const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items: unknown[]) => items.length > 0, message: "An order needs at least one item" },
    },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: paymentMethods, required: true },
    paymentStatus: { type: String, enum: paymentStatuses, required: true },
    status: { type: String, enum: orderStatuses, default: "placed" },
    transactionId: { type: String },
    payerName: { type: String, trim: true },
    reviewNotes: { type: [String], default: [] },
    pickupCode: { type: String, required: true, unique: true },
    paidAt: { type: Date },
    collectedAt: { type: Date },
reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
collectedBy: { type: Schema.Types.ObjectId, ref: "User" },  },
  { timestamps: true },
)

// One live claim per transaction: a rejected payment frees its ID so an honest student can retry
orderSchema.index(
  { paymentMethod: 1, transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { transactionId: { $type: "string" }, paymentStatus: { $in: ["review", "paid"] } },
  },
)
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ paymentStatus: 1, status: 1, createdAt: -1 })

export type Order = InferSchemaType<typeof orderSchema>

export default model("Order", orderSchema)