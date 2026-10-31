import type { HydratedDocument } from "mongoose"
import OrderModel from "../models/order.model.js"
import type { Order } from "../models/order.model.js"
import ApiError from "../utils/ApiError.js"
import type { AdminOrderQuery } from "../validators/order.schema.js"
import { autoVerify, toStudentOrder } from "./order.service.js"
export async function recheckPayment(id: string) {
  await OrderModel.updateOne({ _id: id, paymentStatus: "review" }, { $unset: { receiptCheckedAt: 1 } })
  await autoVerify(id)

  const order = await OrderModel.findById(id).populate("user", CUSTOMER)
  if (!order) throw new ApiError(404, "Order not found")
  return toAdminOrder(order)
}
const CUSTOMER = "fullName phone email"
const options = { returnDocument: "after", runValidators: true } as const

export function toAdminOrder(order: HydratedDocument<Order>) {
  const customer = order.user as unknown as { fullName: string; phone: string; email: string }
  return {
    ...toStudentOrder(order),
    customer: { fullName: customer.fullName, phone: customer.phone, email: customer.email },
    transactionId: order.transactionId,
    payerName: order.payerName,
    reviewNotes: order.reviewNotes,
        receiptSource: order.receiptSource,
    paidTo: order.paidTo,
    receipt: order.receipt?.paidAt
      ? {
          payerName: order.receipt.payerName,
          receiverName: order.receipt.receiverName,
          amount: order.receipt.amount,
          paidAt: order.receipt.paidAt,
        }
      : undefined,
  }
}

function moved(order: HydratedDocument<Order> | null, message: string) {
  if (!order) throw new ApiError(409, message)
  return toAdminOrder(order)
}

export async function listOrders(query: AdminOrderQuery) {
  const filter = {
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { $or: [{ pickupCode: query.search }, { transactionId: query.search }] } : {}),
  }

  const [items, total] = await Promise.all([
    OrderModel.find(filter)
      .populate("user", CUSTOMER)
      .sort({ createdAt: query.paymentStatus === "review" ? 1 : -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    OrderModel.countDocuments(filter),
  ])

  return {
    items: items.map(toAdminOrder),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  }
}

export async function approvePayment(id: string, adminId: string) {
  const order = await OrderModel.findOneAndUpdate(
    { _id: id, paymentStatus: "review" },
    { $set: { paymentStatus: "paid", paidAt: new Date(), reviewedBy: adminId } },
    options,
  ).populate("user", CUSTOMER)
  return moved(order, "This order is not waiting for payment review")
}

export async function rejectPayment(id: string, adminId: string, reason: string) {
  const order = await OrderModel.findOneAndUpdate(
    { _id: id, paymentStatus: "review" },
    {
      $set: { paymentStatus: "rejected", status: "cancelled", reviewedBy: adminId },
      $push: { reviewNotes: `Rejected: ${reason}` },
    },
    options,
  ).populate("user", CUSTOMER)
  return moved(order, "This order is not waiting for payment review")
}

export async function markReady(id: string) {
  const order = await OrderModel.findOneAndUpdate(
    { _id: id, status: "placed", $or: [{ paymentStatus: "paid" }, { paymentMethod: "cod" }] },
    { $set: { status: "ready_for_pickup" } },
    options,
  ).populate("user", CUSTOMER)
  return moved(order, "Only a placed order with a verified payment (or cash on delivery) can be marked ready")
}

export async function markCollected(id: string, adminId: string) {
  const now = new Date()
  const collected = { status: "collected", collectedAt: now, collectedBy: adminId }

  const order =
    (await OrderModel.findOneAndUpdate(
      { _id: id, status: "ready_for_pickup", paymentMethod: "cod" },
      { $set: { ...collected, paymentStatus: "paid", paidAt: now } },
      options,
    ).populate("user", CUSTOMER)) ??
    (await OrderModel.findOneAndUpdate(
      { _id: id, status: "ready_for_pickup", paymentStatus: "paid" },
      { $set: collected },
      options,
    ).populate("user", CUSTOMER))

  return moved(order, "This order is not ready for pickup")
}

export async function cancelOrder(id: string) {
  const order = await OrderModel.findOneAndUpdate(
    { _id: id, status: { $in: ["placed", "ready_for_pickup"] } },
    { $set: { status: "cancelled" }, $push: { reviewNotes: "Cancelled by admin" } },
    options,
  ).populate("user", CUSTOMER)
  return moved(order, "This order can no longer be cancelled")
}
export async function findByPickupCode(code: string) {
  const order = await OrderModel.findOne({ pickupCode: code }).populate("user", CUSTOMER)
  if (!order) throw new ApiError(404, "No order with this pickup code")
  return toAdminOrder(order)
}