import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { HydratedDocument } from "mongoose"
import { env } from "../config/env.js"
import UserModel from "../models/user.model.js"
import type { User } from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import type { LoginInput, RegisterInput } from "../validators/auth.schema.js"

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

  return issueSession(user)
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash")

  const passwordOk = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !passwordOk) {
    throw new ApiError(401, "Invalid email or password")
  }

  return issueSession(user)
}
export async function getCurrentUser(id: string): Promise<PublicUser> {
  const user = await UserModel.findById(id)

  if (!user) {
    throw new ApiError(401, "Account no longer exists")
  }

  return toPublicUser(user)
}