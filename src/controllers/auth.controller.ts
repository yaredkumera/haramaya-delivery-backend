import type { RequestHandler } from "express"
import { loginUser, registerUser } from "../services/auth.service.js"
import { getCurrentUser } from "../services/auth.service.js"
import { getAuthUser } from "../utils/getAuthUser.js"
import * as password from "../services/password.service.js"
import { updateUserPhone ,googleLogin} from "../services/auth.service.js"

import type { GoogleInput,UpdatePhoneInput,ForgotInput,ResetInput, } from "../validators/auth.schema.js"
export const google: RequestHandler = async (req, res) => {
  const { credential }: GoogleInput = req.body
  res.json({ success: true, message: "Login successful", data: await googleLogin(credential) })
}
export const updatePhone: RequestHandler = async (req, res) => {
  const { phone }: UpdatePhoneInput = req.body
  const user = await updateUserPhone(getAuthUser(req).id, phone)
  res.json({ success: true, message: "Phone number saved", data: { user } })
}

export const forgotPassword: RequestHandler = (req, res) => {
  const { email }: ForgotInput = req.body
  void password.requestPasswordReset(email).catch((error) => {
    console.error("Password reset request failed:", error instanceof Error ? error.message : error)
  })
  res.json({ success: true, message: "If an account exists for this email, a reset link has been sent." })
}

export const resetPassword: RequestHandler = async (req, res) => {
  const { token, password: newPassword }: ResetInput = req.body
  await password.resetPassword(token, newPassword)
  res.json({ success: true, message: "Password changed. You can sign in now." })
}
export const register: RequestHandler = async (req, res) => {
  const result = await registerUser(req.body)
  res.status(201).json({ success: true, message: "Account created", data: result })
}

export const login: RequestHandler = async (req, res) => {
  const result = await loginUser(req.body)
  res.status(200).json({ success: true, message: "Login successful", data: result })
}
export const me: RequestHandler = async (req, res) => {
  const user = await getCurrentUser(getAuthUser(req).id)
  res.status(200).json({ success: true, data: { user } })
}