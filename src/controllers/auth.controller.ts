import type { RequestHandler } from "express"
import * as account from "../services/account.service.js"
import { getCurrentUser, googleLogin, loginUser, registerUser } from "../services/auth.service.js"
import * as password from "../services/password.service.js"
import { getAuthUser } from "../utils/getAuthUser.js"
import type {
  ChangePasswordInput,
  ForgotInput,
  GoogleInput,
  ResetInput,
  UpdateProfileInput,
} from "../validators/auth.schema.js"

export const register: RequestHandler = async (req, res) => {
  const result = await registerUser(req.body)
  res.status(201).json({ success: true, message: "Account created", data: result })
}

export const login: RequestHandler = async (req, res) => {
  const result = await loginUser(req.body)
  res.status(200).json({ success: true, message: "Login successful", data: result })
}

export const google: RequestHandler = async (req, res) => {
  const { credential }: GoogleInput = req.body
  res.json({ success: true, message: "Login successful", data: await googleLogin(credential) })
}

export const me: RequestHandler = async (req, res) => {
  const user = await getCurrentUser(getAuthUser(req).id)
  res.status(200).json({ success: true, data: { user } })
}

export const updateProfile: RequestHandler = async (req, res) => {
  const input: UpdateProfileInput = req.body
  const user = await account.updateProfile(getAuthUser(req).id, input)
  res.json({ success: true, message: "Saved", data: { user } })
}

export const changePassword: RequestHandler = async (req, res) => {
  const { currentPassword, newPassword }: ChangePasswordInput = req.body
  const result = await account.changePassword(getAuthUser(req).id, currentPassword, newPassword)
  res.json({ success: true, message: "Password changed", data: result })
}

export const uploadAvatar: RequestHandler = async (req, res) => {
  const user = await account.setAvatar(getAuthUser(req).id, req.file?.buffer)
  res.json({ success: true, message: "Photo updated", data: { user } })
}

export const removeAvatar: RequestHandler = async (req, res) => {
  const user = await account.clearAvatar(getAuthUser(req).id)
  res.json({ success: true, message: "Photo removed", data: { user } })
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