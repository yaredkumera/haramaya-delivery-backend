import { Schema, model, Types } from "mongoose"
import type { InferSchemaType } from "mongoose"

const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false } // Prevents generating a separate _id for each cart sub-item
)

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", // Match your user model registration name (usually "User" or "userModel")
      required: true,
      unique: true,
    },
    items: [cartItemSchema], // Array of products and quantities
  },
  {
    timestamps: true,
  }
)

export type Cart = InferSchemaType<typeof cartSchema>

export default model("Cart", cartSchema)