import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { HydratedDocument } from "mongoose"
import { env } from "../config/env.js"
import UserModel from "../models/user.model.js"
import type { User } from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import type { LoginInput, RegisterInput } from "../validators/auth.schema.js"
import { sendEmail } from "../utils/sendEmail.js"
export type PublicUser = Pick<User, "fullName" | "phone" | "email" | "role"> & { id: string }
export type AuthResult = { token: string; user: PublicUser }

// Used so login takes about the same time whether or not the email exists
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12)

function toPublicUser(user: HydratedDocument<User>): PublicUser {
  return {
    id: String(user._id),
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
  }
}

function issueSession(user: HydratedDocument<User>): AuthResult {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: "7d",
  })
  return { token, user: toPublicUser(user) }
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await UserModel.findOne({
    $or: [{ email: input.email }, { phone: input.phone }],
  })

  if (existing) {
    throw new ApiError(
      409,
      existing.email === input.email ? "Email already registered" : "Phone number already registered",
    )
  }

  const passwordHash = await bcrypt.hash(input.password, 12)

  const user = await UserModel.create({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    passwordHash,
  })
// 📧 Send Welcome Email (Fire and forget, non-blocking)
  sendEmail({
    to: user.email,
    subject: "Welcome to Haramaya Campus Delivery! 🍔",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Welcome, ${user.fullName}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now order food and campus essentials directly to your dorm block.</p>
        <br/>
        <p>Need help with checkout or payment? Contact our dispatch team anytime!</p>
      </div>
    `,
    text: `Welcome, ${user.fullName}! Your account has been created successfully.`,
  }).catch((err) => console.error("Failed to fire welcome email:", err))

  // 📧 (Optional) Alert Yourself/Admin when a new user signs up
  if (env.ADMIN_EMAIL) {
    sendEmail({
      to: env.ADMIN_EMAIL,
      subject: `🚨 New Registration: ${user.fullName}`,
      html: `<p>New student registered: <strong>${user.fullName}</strong> (${user.phone}, ${user.email})</p>`,
    }).catch((err) => console.error("Failed to fire admin alert email:", err))
  }
  return issueSession(user)
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash")

  const passwordOk = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !passwordOk) {
    throw new ApiError(401, "Invalid email or password")
  }
  if (user.blocked) throw new ApiError(403, "This account has been blocked. Please contact support.")
  return issueSession(user)
}
export async function getCurrentUser(id: string): Promise<PublicUser> {
  const user = await UserModel.findById(id)

  if (!user) {
    throw new ApiError(401, "Account no longer exists")
  }

  return toPublicUser(user)
}