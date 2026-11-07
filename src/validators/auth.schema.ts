import { z } from "zod"
import { text } from "./common.js"

const emailSchema = text("Email")
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"))

const fullNameSchema = text("Full name")
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be at most 80 characters")

export const phoneSchema = text("Phone number")
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+251|251|0)?[79]\d{8}$/, "Enter a valid Ethiopian phone number"))
  .transform((value) => `+251${value.slice(-9)}`)

export const passwordSchema = text("Password")
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")

export const registerSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: text("Password").min(1, "Password is required").max(72, "Password is too long"),
})

export const googleSchema = z.object({ credential: text("Google credential").min(20).max(4096) })

export const updateProfileSchema = z
  .object({ fullName: fullNameSchema.optional(), phone: phoneSchema.optional() })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" })

export const changePasswordSchema = z
  .object({
    currentPassword: text("Current password").min(1, "Current password is required").max(72),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a different password",
    path: ["newPassword"],
  })

export const forgotSchema = z.object({ email: emailSchema })
export const resetSchema = z.object({
  token: z.string({ error: "This reset link is invalid" }).regex(/^[a-f0-9]{64}$/, "This reset link is invalid"),
  password: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type GoogleInput = z.infer<typeof googleSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ForgotInput = z.infer<typeof forgotSchema>
export type ResetInput = z.infer<typeof resetSchema>