import type { RequestHandler } from "express"
import { loginUser, registerUser } from "../services/auth.service.js"
import { getCurrentUser } from "../services/auth.service.js"
import { getAuthUser } from "../utils/getAuthUser.js"
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