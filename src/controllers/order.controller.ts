import type { RequestHandler } from "express"
import { env } from "../config/env.js"
import * as orders from "../services/order.service.js"
import * as admin from "../services/order.admin.service.js"
import { getAuthUser } from "../utils/getAuthUser.js"
import { adminOrderQuerySchema } from "../validators/order.schema.js"
import type { CheckoutInput, RejectInput } from "../validators/order.schema.js"

type WithId = { id: string }

export const paymentInfo: RequestHandler = (_req, res) => {
  res.json({
    success: true,
    data: {
      telebirr: { name: env.TELEBIRR_NAME, number: env.TELEBIRR_NUMBER },
      cbe: { name: env.CBE_NAME, number: env.CBE_ACCOUNT },
    },
  })
}

export const checkout: RequestHandler = async (req, res) => {
  const input: CheckoutInput = req.body
  const order = await orders.placeOrder(getAuthUser(req).id, input)
  res.status(201).json({ success: true, message: "Order placed", data: { order } })
}

export const listMine: RequestHandler = async (req, res) => {
  res.json({ success: true, data: { orders: await orders.listMyOrders(getAuthUser(req).id) } })
}

export const getMine: RequestHandler<WithId> = async (req, res) => {
  res.json({ success: true, data: { order: await orders.getMyOrder(getAuthUser(req).id, req.params.id) } })
}

export const adminList: RequestHandler = async (req, res) => {
  const data = await admin.listOrders(adminOrderQuerySchema.parse(req.query))
  res.json({ success: true, data })
}

export const approve: RequestHandler<WithId> = async (req, res) => {
  const order = await admin.approvePayment(req.params.id, getAuthUser(req).id)
  res.json({ success: true, message: "Payment approved", data: { order } })
}

export const reject: RequestHandler<WithId> = async (req, res) => {
  const { reason }: RejectInput = req.body
  const order = await admin.rejectPayment(req.params.id, getAuthUser(req).id, reason)
  res.json({ success: true, message: "Payment rejected", data: { order } })
}

export const ready: RequestHandler<WithId> = async (req, res) => {
  res.json({ success: true, message: "Marked ready for pickup", data: { order: await admin.markReady(req.params.id) } })
}

export const collect: RequestHandler<WithId> = async (req, res) => {
  const order = await admin.markCollected(req.params.id, getAuthUser(req).id)
  res.json({ success: true, message: "Order collected", data: { order } })
}

export const cancel: RequestHandler<WithId> = async (req, res) => {
  res.json({ success: true, message: "Order cancelled", data: { order: await admin.cancelOrder(req.params.id) } })
}