import type { ErrorRequestHandler, Response } from "express"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { ZodError } from "zod"
import ApiError from "../utils/ApiError.js"
import type { FieldError } from "../utils/ApiError.js"
import multer from "multer"
function hasCode(err: unknown): err is { code: number } {
  return typeof err === "object" && err !== null && "code" in err
}

function hasType(err: unknown): err is { type: string } {
  return typeof err === "object" && err !== null && "type" in err
}

function fail(res: Response, status: number, message: string, errors?: FieldError[]) {
  res.status(status).json({ success: false, message, ...(errors && { errors }) })
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, next) => {
  if (res.headersSent) return next(err)

  if (err instanceof ApiError) {
    return fail(res, err.statusCode, err.message, err.errors)
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    return fail(res, 400, "Validation failed", errors)
  }

  if (err instanceof mongoose.Error.CastError) {
    return fail(res, 400, `Invalid value for "${err.path}"`)
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    return fail(res, 400, "Validation failed", errors)
  }

  if (hasCode(err) && err.code === 11000) {
    return fail(res, 409, "Already exists")
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return fail(res, 401, "Invalid or expired token")
  }

  if (hasType(err) && err.type === "entity.parse.failed") {
    return fail(res, 400, "Invalid JSON in request body")
  }

  if (hasType(err) && err.type === "entity.too.large") {
    return fail(res, 413, "Request body too large")
  }
  if (err instanceof multer.MulterError) {
    return err.code === "LIMIT_FILE_SIZE"
      ? fail(res, 413, "Image is too large (max 3 MB)")
      : fail(res, 400, "Invalid file upload")
  }
  console.error(err)
  return fail(res, 500, "Internal server error")
}