import { randomInt } from "node:crypto"
import mongoose from "mongoose"
import type { HydratedDocument } from "mongoose"
import { env } from "../config/env.js"
import CartModel from "../models/cart.model.js"
import OrderModel from "../models/order.model.js"
import type { Order } from "../models/order.model.js"
import type { Product } from "../models/product.model.js"
import ApiError from "../utils/ApiError.js"
import type { CheckoutInput } from "../validators/order.schema.js"
import { checkReceipt, fetchReceipt } from "./receipt.service.js"

type DigitalCheckout = Extract<CheckoutInput, { transactionId: string }>

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const newPickupCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")

export function toStudentOrder(order: HydratedDocument<Order>) {
  return {
    id: String(order._id),
    items: order.items.map(({ product, name, price, imageUrl, quantity }) => ({
      productId: String(product),
      name,
      price,
      imageUrl,
      quantity,
    })),
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    pickupCode: order.pickupCode,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    collectedAt: order.collectedAt,
  }
}

async function assessPayment(input: DigitalCheckout, total: number) {
  const taken = await OrderModel.exists({
    
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId,
    paymentStatus: { $in: ["review", "paid"] },
  })
  if (taken) throw new ApiError(409, "This transaction ID was already used for another order")

  const receipt = await fetchReceipt(input.paymentMethod, input.transactionId).catch((error) => {
    console.error("Receipt check failed:", error)
    return null
  })

  const receiver = input.paymentMethod === "telebirr" ? env.TELEBIRR_NAME : env.CBE_NAME
  const receiverAccountEnd = input.paymentMethod === "cbe" ? env.CBE_ACCOUNT.replace(/\D/g, "").slice(-4) : undefined
  const problems = receipt
    ? checkReceipt(receipt, {
        reference: input.transactionId,
        amount: total,
        payerName: input.payerName,
        receiver,
        receiverAccountEnd,
      })
    : ["The receipt could not be checked automatically"]

  return problems.length === 0
    ? { paymentStatus: "paid" as const, paidAt: new Date(), reviewNotes: [] as string[] }
    : { paymentStatus: "review" as const, reviewNotes: problems }
}

export async function placeOrder(userId: string, input: CheckoutInput) {
  const cart = await CartModel.findOne({ user: userId }).populate("items.product")
  if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty")

  const items = cart.items.map(({ product, quantity }) => {
    const item = product as unknown as HydratedDocument<Product> | null
    if (!item?.available) {
      throw new ApiError(409, "An item in your cart is no longer available. Remove it and try again.")
    }
    return { product: item._id, name: item.name, price: item.price, imageUrl: item.imageUrl, quantity }
  })
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const digital = input.paymentMethod === "cod" ? null : input
  const payment = digital
    ? await assessPayment(digital, total)
    : { paymentStatus: "unpaid" as const, reviewNotes: [] as string[] }

  const order = await mongoose.connection.transaction(async (session) => {
    const [created] = await OrderModel.create(
      [
        {
          user: userId,
          items,
          total,
          paymentMethod: input.paymentMethod,
          ...(digital ? { transactionId: digital.transactionId, payerName: digital.payerName } : {}),
          ...payment,
          pickupCode: newPickupCode(),
        },
      ],
      { session },
    )
    await CartModel.updateOne({ user: userId }, { $set: { items: [] } }, { session })
    return created
  })

  return toStudentOrder(order)
}

export async function listMyOrders(userId: string) {
  const orders = await OrderModel.find({ user: userId }).sort({ createdAt: -1 }).limit(50)
  return orders.map(toStudentOrder)
}

export async function getMyOrder(userId: string, id: string) {
  const order = await OrderModel.findOne({ _id: id, user: userId })
  if (!order) throw new ApiError(404, "Order not found")
  return toStudentOrder(order)
}