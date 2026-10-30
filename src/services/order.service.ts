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
import { checkReceipt, detectSource, fetchReceipt } from "./receipt.service.js"
import type { ReceiptSource } from "../models/order.model.js"
type DigitalCheckout = Extract<CheckoutInput, { transactionId: string }>

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const newPickupCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")
const maskId = (id?: string | null) => (id && id.length > 6 ? `${id.slice(0, 3)}****${id.slice(-3)}` : (id ?? undefined))
    
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
        payment: {
      receiptSource: order.receiptSource,
      paidTo: order.paidTo,
      payerName: order.receipt?.payerName ?? order.payerName,
      paidAt: order.receipt?.paidAt ?? order.paidAt,
      transactionId: maskId(order.transactionId),
    },
  }
}

async function assertUnclaimed(source: ReceiptSource, transactionId: string) {
  const taken = await OrderModel.exists({
    receiptSource: source,
    transactionId,
    paymentStatus: { $in: ["review", "paid"] },
  })
  if (taken) throw new ApiError(409, "This transaction ID was already used for another order")
}

async function readAndCheck(source: ReceiptSource, transactionId: string, payerName: string, total: number) {
  const receipt = await fetchReceipt(source, transactionId)
  if (!receipt) {
    return { receipt: null, problems: ["The receipt could not be checked automatically"], paidTo: undefined }
  }
  return { receipt, ...checkReceipt(receipt, { reference: transactionId, amount: total, payerName }) }
}

// Safe to call again and again: it only changes an order that is still waiting for review
export async function autoVerify(orderId: string) {
  const order = await OrderModel.findOne({ _id: orderId, paymentStatus: "review" })
  if (!order || !order.receiptSource || !order.transactionId || !order.payerName) return

  const { receipt, problems, paidTo } = await readAndCheck(
    order.receiptSource,
    order.transactionId,
    order.payerName,
    order.total,
  )

  const facts = receipt
    ? {
        receipt: {
          payerName: receipt.payerName,
          receiverName: receipt.receiver,
          amount: receipt.amount,
          paidAt: receipt.paidAt,
        },
        ...(paidTo ? { paidTo } : {}),
      }
    : {}

  await OrderModel.updateOne(
    { _id: orderId, paymentStatus: "review" },
    {
      $set: {
        ...facts,
        reviewNotes: problems,
        ...(problems.length === 0 ? { paymentStatus: "paid", paidAt: new Date() } : {}),
      },
    },
  )
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

    let digital: { transactionId: string; payerName: string; receiptSource: ReceiptSource } | null = null
  if (input.paymentMethod !== "cod") {
    const receiptSource = detectSource(input.transactionId)
    if (!receiptSource) throw new ApiError(400, "Enter the transaction ID exactly as shown on your receipt")
    await assertUnclaimed(receiptSource, input.transactionId)
    digital = { transactionId: input.transactionId, payerName: input.payerName, receiptSource }
  }

  const payment = digital
    ? { paymentStatus: "review" as const, reviewNotes: ["Waiting for the automatic receipt check"] }
    : { paymentStatus: "unpaid" as const, reviewNotes: [] as string[] }

  const order = await mongoose.connection.transaction(async (session) => {
    const [created] = await OrderModel.create(
      [
        {
          user: userId,
          items,
          total,
          paymentMethod: input.paymentMethod,
          ...(digital ?? {}),
          ...payment,
          pickupCode: newPickupCode(),
        },
      ],
      { session },
    )
    await CartModel.updateOne({ user: userId }, { $set: { items: [] } }, { session })
    return created
  })
  if (digital) {
    void autoVerify(String(order._id)).catch((error) => console.error("Auto verification failed:", error))
  }
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