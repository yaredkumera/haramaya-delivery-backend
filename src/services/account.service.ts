import bcrypt from "bcryptjs"
import UserModel from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import type { UpdateProfileInput } from "../validators/auth.schema.js"
import { issueSession, toPublicUser } from "./auth.service.js"
import { deleteImage, uploadAvatarImage } from "./cloudinary.service.js"

async function loadUser(id: string, extra = "") {
  const user = await UserModel.findById(id).select(`+passwordHash ${extra}`.trim())
  if (!user) throw new ApiError(401, "Account no longer exists")
  return user
}

const removeImage = (publicId?: string | null) =>
  publicId
    ? deleteImage(publicId).catch((error) => console.error("Could not delete image:", publicId, error))
    : Promise.resolve()

export async function updateProfile(id: string, input: UpdateProfileInput) {
  if (input.phone && (await UserModel.exists({ phone: input.phone, _id: { $ne: id } }))) {
    throw new ApiError(409, "Phone number already registered")
  }
  const user = await loadUser(id)
  user.set(input)
  await user.save()
  return toPublicUser(user)
}

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const user = await loadUser(id)

  if (!user.passwordHash) {
    throw new ApiError(400, 'This account signs in with Google. Use "Forgot password" if you want to add a password.')
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect")
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12)
  user.tokensValidFrom = new Date()
  await user.save()
  return issueSession(user)
}

export async function setAvatar(id: string, image: Buffer | undefined) {
  if (!image) throw new ApiError(400, "Choose a photo")

  const user = await loadUser(id, "+avatarPublicId")
  const oldPublicId = user.avatarPublicId
  const uploaded = await uploadAvatarImage(image)

  user.avatarUrl = uploaded.url
  user.avatarPublicId = uploaded.publicId
  try {
    await user.save()
  } catch (error) {
    await removeImage(uploaded.publicId)
    throw error
  }

  await removeImage(oldPublicId)
  return toPublicUser(user)
}

export async function clearAvatar(id: string) {
  const user = await loadUser(id, "+avatarPublicId")
  const oldPublicId = user.avatarPublicId

  user.avatarUrl = undefined
  user.avatarPublicId = undefined
  await user.save()

  await removeImage(oldPublicId)
  return toPublicUser(user)
}