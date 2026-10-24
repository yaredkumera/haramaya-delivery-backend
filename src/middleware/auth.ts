import type { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { env } from "../config/env.js"
import ApiError from "../utils/ApiError.js"
import type { User } from "../models/user.model.js"
import { getAuthUser } from "../utils/getAuthUser.js"
const payloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["student", "admin"]),
})

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication required")
  }

  const payload = payloadSchema.safeParse(
    jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ["HS256"] }),
  )

  if (!payload.success) {
    throw new ApiError(401, "Invalid token")
  }

  req.user = { id: payload.data.sub, role: payload.data.role }
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