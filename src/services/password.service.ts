import { createHash, randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { env } from "../config/env.js"
import UserModel from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import { sendEmail } from "./email.service.js"

const RESET_MINUTES = 60
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")

async function issueResetLink(userId: string) {
  const token = randomBytes(32).toString("hex")
  await UserModel.updateOne(
    { _id: userId },
    { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_MINUTES * 60_000) } },
  )
  return `${env.FRONTEND_URL}/reset-password/${token}`
}

export async function requestPasswordReset(email: string) {
  const user = await UserModel.findOne({ email, blocked: { $ne: true } }).select("_id")
  if (!user) return

  const link = await issueResetLink(String(user._id))
  await sendEmail({
    to: email,
    subject: "Reset your Haramaya Delivery password",
    text: `Open this link to choose a new password (valid for ${RESET_MINUTES} minutes):\n${link}\n\nIf you did not ask for this, ignore this email.`,
    html: `<p>Open this link to choose a new password (valid for ${RESET_MINUTES} minutes):</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore this email.</p>`,
  })
}

export async function createResetLink(userId: string) {
  if (!(await UserModel.exists({ _id: userId, role: "student" }))) {
    throw new ApiError(404, "Student account not found")
  }
  return issueResetLink(userId)
}

export async function resetPassword(token: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await UserModel.findOneAndUpdate(
    { resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } },
    { $set: { passwordHash, tokensValidFrom: new Date() }, $unset: { resetTokenHash: 1, resetTokenExpires: 1 } },
  )
  if (!user) throw new ApiError(400, "This reset link is invalid or has expired")
}