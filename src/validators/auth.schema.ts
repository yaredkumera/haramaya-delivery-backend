import { z } from "zod"

import {text} from "./common.js"

const emailSchema = text("Email")
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"))

const phoneSchema = text("Phone number")
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(
    z.string().regex(/^(\+251|251|0)?[79]\d{8}$/, "Enter a valid Ethiopian phone number"),
  )
  .transform((value) => `+251${value.slice(-9)}`)

export const registerSchema = z.object({
  fullName: text("Full name")
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
  phone: phoneSchema,
  email: emailSchema,
  password: text("Password")
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: text("Password")
    .min(1, "Password is required")
    .max(72, "Password is too long"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>