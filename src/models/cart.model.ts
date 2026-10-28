import { Schema, model } from "mongoose"
import type { InferSchemaType } from "mongoose"

export const MAX_CART_QUANTITY = 20

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, max: MAX_CART_QUANTITY, default: 1 },
  },
  { _id: false },
)

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
)

export type Cart = InferSchemaType<typeof cartSchema>

export default model("Cart", cartSchema)