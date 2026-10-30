import { Schema, model } from "mongoose"
import type { InferSchemaType } from "mongoose"

export const paymentMethods = ["cod", "telebirr", "cbe"] as const
export type PaymentMethod = (typeof paymentMethods)[number]

export const paymentStatuses = ["unpaid", "review", "paid", "rejected"] as const
export type PaymentStatus = (typeof paymentStatuses)[number]

export const orderStatuses = ["placed", "ready_for_pickup", "collected", "cancelled"] as const
export type OrderStatus = (typeof orderStatuses)[number]
export const receiptSources = ["telebirr", "cbe"] as const
export type ReceiptSource = (typeof receiptSources)[number]

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
        receiptSource: { type: String, enum: receiptSources },
    paidTo: { type: String, enum: receiptSources },
    receipt: {
      payerName: { type: String },
      receiverName: { type: String },
      amount: { type: Number },
      paidAt: { type: Date },
    },
    reviewNotes: { type: [String], default: [] },
    pickupCode: { type: String, required: true, unique: true },
    paidAt: { type: Date },
    collectedAt: { type: Date },
reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
collectedBy: { type: Schema.Types.ObjectId, ref: "User" },  },
  { timestamps: true },
)

orderSchema.index(
  { receiptSource: 1, transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { transactionId: { $type: "string" }, paymentStatus: { $in: ["review", "paid"] } },
  },
)
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ paymentStatus: 1, status: 1, createdAt: -1 })

export type Order = InferSchemaType<typeof orderSchema>

export default model("Order", orderSchema)