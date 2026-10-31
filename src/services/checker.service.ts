import OrderModel from "../models/order.model.js"
import { autoVerify } from "./order.service.js"
import { parseTelebirr } from "./receipt.service.js"

const DAY_MS = 24 * 60 * 60 * 1000

export async function pendingJobs() {
  const orders = await OrderModel.find({
    paymentStatus: "review",
    receiptSource: "telebirr",
    receiptCheckedAt: { $exists: false },
    createdAt: { $gt: new Date(Date.now() - DAY_MS) },
  })
    .sort({ createdAt: 1 })
    .limit(5)
    .select("transactionId")
  return orders.map((o) => ({ orderId: String(o._id), transactionId: o.transactionId }))
}

// The transaction ID always comes from our database, never from the checker
export async function applyResult(orderId: string, html: string | null) {
  const order = await OrderModel.findOne({ _id: orderId, paymentStatus: "review", receiptSource: "telebirr" }).select(
    "transactionId",
  )
  if (!order?.transactionId) return
  const receipt = html ? parseTelebirr(order.transactionId, html) : null
  await autoVerify(orderId, receipt)
}