import { v2 as cloudinary } from "cloudinary"
import type { UploadApiOptions } from "cloudinary"
import { env } from "../config/env.js"
import ApiError from "../utils/ApiError.js"

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
})

export type UploadedImage = { url: string; publicId: string }

function upload(buffer: Buffer, options: UploadApiOptions): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp"], ...options },
        (error, result) => {
          if (error || !result) {
            console.error("Cloudinary upload failed:", error)
            return reject(new ApiError(502, "Image upload failed. Please try again."))
          }
          resolve({ url: result.secure_url, publicId: result.public_id })
        },
      )
      .end(buffer)
  })
}

export const uploadProductImage = (buffer: Buffer) => upload(buffer, { folder: "haramaya-delivery/products" })

export const uploadAvatarImage = (buffer: Buffer) =>
  upload(buffer, {
    folder: "haramaya-delivery/avatars",
    transformation: [{ width: 256, height: 256, crop: "fill", gravity: "auto" }],
  })

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}