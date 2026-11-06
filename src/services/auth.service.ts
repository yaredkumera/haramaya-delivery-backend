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
import {OAuth2Client} from "google-auth-library"
import { notifyAdmin } from "./email.service.js"
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12)
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID)

async function linkOrCreate(googleId: string, email: string, name?: string) {
  // An existing password account with this email gets linked. Its old password is removed,
  // so a password set by someone else before (we never verified the email) cannot be used.
  const linked = await UserModel.findOneAndUpdate(
    { email, googleId: { $exists: false } },
    { $set: { googleId }, $unset: { passwordHash: 1 } },
    { returnDocument: "after" },
  )
  if (linked) return linked
  const created = await UserModel.create({ fullName: (name || email.split("@")[0]).slice(0, 80), email, googleId })
  notifyAdmin("New student registered with Google", `${created.fullName}\n${created.email}`)
  return created}

export async function googleLogin(credential: string): Promise<AuthResult> {
  const ticket = await googleClient
    .verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID })
    .catch(() => null)
  const profile = ticket?.getPayload()

  if (!profile?.sub || !profile.email || !profile.email_verified) {
    throw new ApiError(401, "Google sign-in failed")
  }

  const user =
    (await UserModel.findOne({ googleId: profile.sub })) ??
    (await linkOrCreate(profile.sub, profile.email.toLowerCase(), profile.name))

  if (user.blocked) throw new ApiError(403, "This account has been blocked. Please contact support.")
  return issueSession(user)
}

export async function updateUserPhone(id: string, phone: string): Promise<PublicUser> {
  if (await UserModel.exists({ phone, _id: { $ne: id } })) {
    throw new ApiError(409, "Phone number already registered")
  }
  const user = await UserModel.findByIdAndUpdate(
    id,
    { $set: { phone } },
    { returnDocument: "after", runValidators: true },
  )
  if (!user) throw new ApiError(401, "Account no longer exists")
  return toPublicUser(user)
}
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
    notifyAdmin("New student registered", `${user.fullName}\n${user.email}\n${user.phone}`)
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