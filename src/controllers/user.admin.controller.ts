import type { RequestHandler } from "express"
import * as users from "../services/user.admin.service.js"
import { userQuerySchema } from "../validators/user.schema.js"
import { createResetLink } from "../services/password.service.js"
type WithId = { id: string }

export const list: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await users.listUsers(userQuerySchema.parse(req.query)) })
}

export const block: RequestHandler<WithId> = async (req, res) => {
  res.json({ success: true, message: "User blocked", data: { user: await users.setBlocked(req.params.id, true) } })
}

export const unblock: RequestHandler<WithId> = async (req, res) => {
  res.json({ success: true, message: "User unblocked", data: { user: await users.setBlocked(req.params.id, false) } })
}

export const remove: RequestHandler<WithId> = async (req, res) => {
  await users.deleteUser(req.params.id)
  res.json({ success: true, message: "User deleted" })
}
export const resetLink: RequestHandler<WithId> = async (req, res) => {
  res.json({ success: true, data: { link: await createResetLink(req.params.id) } })
}