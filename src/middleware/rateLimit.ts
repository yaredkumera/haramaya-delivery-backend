import { rateLimit } from "express-rate-limit"
import ApiError from "../utils/ApiError.js"



  const limiter = (windowMinutes: number, limit: number, message: string, skipSuccessful = false, byUser = false) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    ...(byUser && { keyGenerator: (req) => req.user?.id ?? "anonymous" }),
    handler: (_req, _res, next) => next(new ApiError(429, message)),
  })

export const checkoutLimiter = limiter(60, 10, "Too many checkout attempts. Try again in an hour.", false, true)
export const loginLimiter = limiter(15, 10, "Too many login attempts. Try again in a few minutes.", true)
export const registerLimiter = limiter(60, 20, "Too many sign-ups from this network. Try again later.")