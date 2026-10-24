import type { Request } from "express"
import ApiError from "./ApiError.js"

export function getAuthUser(req: Request) {
  if (!req.user) throw new ApiError(401, "Authentication required")
  return req.user
}