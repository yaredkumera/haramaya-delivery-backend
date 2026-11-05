import type { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { env } from "../config/env.js"
import ApiError from "../utils/ApiError.js"
import type { User } from "../models/user.model.js"
import { getAuthUser } from "../utils/getAuthUser.js"
import UserModel from "../models/user.model.js"
const payloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["student", "admin"]),
  iat:z.number(),
})

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required")

  const payload = payloadSchema.safeParse(
    jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ["HS256"] }),
  )
  if (!payload.success) throw new ApiError(401, "Invalid token")

  
  const user = await UserModel.findById(payload.data.sub).select("role blocked tokensValidFrom")
  if (!user) throw new ApiError(401, "Account no longer exists")
  if (user.blocked) throw new ApiError(401, "Your account has been blocked")
  if (user.tokensValidFrom && payload.data.iat < Math.floor(user.tokensValidFrom.getTime() / 1000)) {
    throw new ApiError(401, "Please sign in again")
  }
  req.user = { id: String(user._id), role: user.role }
  next()
}

export const requireRole =
  (...roles: User["role"][]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(getAuthUser(req).role)) {
      throw new ApiError(403, "Forbidden")
    }
    next()
  }