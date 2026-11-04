import type { HydratedDocument } from "mongoose"
import CartModel from "../models/cart.model.js"
import OrderModel from "../models/order.model.js"
import UserModel from "../models/user.model.js"
import type { User } from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import { escapeRegex } from "../utils/escapeRegex.js"
import type { UserQuery } from "../validators/user.schema.js"

const filters = {
  all: {},
  students: { role: "student" },
  admins: { role: "admin" },
  blocked: { blocked: true },
} as const

export function toAdminUser(user: HydratedDocument<User>) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    blocked: Boolean(user.blocked),
    createdAt: user.createdAt,
  }
}

export async function listUsers(query: UserQuery) {
  const text = query.search ? { $regex: escapeRegex(query.search), $options: "i" } : null
  const filter = {
    ...filters[query.filter],
    ...(text ? { $or: [{ fullName: text }, { email: text }, { phone: text }] } : {}),
  }

  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    UserModel.countDocuments(filter),
  ])

  return {
    items: items.map(toAdminUser),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  }
}

export async function setBlocked(id: string, blocked: boolean) {
  const user = await UserModel.findOneAndUpdate(
    { _id: id, role: "student" },
    { $set: { blocked } },
    { returnDocument: "after", runValidators: true },
  )
  if (!user) throw new ApiError(404, "Student account not found")
  return toAdminUser(user)
}

export async function deleteUser(id: string) {
  if (await OrderModel.exists({ user: id })) {
    throw new ApiError(409, "This user has orders. Block the account instead of deleting it")
  }
  const user = await UserModel.findOneAndDelete({ _id: id, role: "student" })
  if (!user) throw new ApiError(404, "Student account not found")
  await CartModel.deleteOne({ user: id })
}