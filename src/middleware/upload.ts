import multer from "multer"
import ApiError from "../utils/ApiError.js"

const allowedTypes = ["image/jpeg", "image/png", "image/webp"]

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) return cb(null, true)
    cb(new ApiError(400, "Only JPG, PNG or WebP images are allowed"))
  },
})

export const uploadImage = upload.single("image")