import { Schema, model } from "mongoose"
import type { InferSchemaType } from "mongoose"

export const markets = ["harar", "dire"] as const
export type Market = (typeof markets)[number]

export const categories = ["electronics", "personal-care", "study", "dorm", "food"] as const
export type Category = (typeof categories)[number]

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: "Price must be a whole number" },
    },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true, select: false },
    category: { type: String, enum: categories, required: true },
    market: { type: String, enum: markets, required: true },
    badge: { type: String, trim: true, maxlength: 24 },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
)

productSchema.index({ available: 1, createdAt: -1 })

export type Product = InferSchemaType<typeof productSchema>

export default model("Product", productSchema)