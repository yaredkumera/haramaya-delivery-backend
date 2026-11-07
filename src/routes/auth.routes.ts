import { Router } from "express"
import { authenticate } from "../middleware/auth.js"
import {
  avatarLimiter,
  loginLimiter,
  passwordLimiter,
  registerLimiter,
  resetLimiter,
} from "../middleware/rateLimit.js"
import { uploadImage } from "../middleware/upload.js"
import validate from "../middleware/validate.js"
import {
  changePasswordSchema,
  forgotSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  updateProfileSchema,
} from "../validators/auth.schema.js"
import {
  changePassword,
  forgotPassword,
  google,
  login,
  me,
  register,
  removeAvatar,
  resetPassword,
  updateProfile,
  uploadAvatar,
} from "../controllers/auth.controller.js"

const router = Router()

router.post("/register", registerLimiter, validate(registerSchema), register)
router.post("/login", loginLimiter, validate(loginSchema), login)
router.post("/google", loginLimiter, validate(googleSchema), google)
router.post("/forgot-password", resetLimiter, validate(forgotSchema), forgotPassword)
router.post("/reset-password", resetLimiter, validate(resetSchema), resetPassword)

router.get("/me", authenticate, me)
router.patch("/me", authenticate, validate(updateProfileSchema), updateProfile)
router.post("/me/avatar", authenticate, avatarLimiter, uploadImage, uploadAvatar)
router.delete("/me/avatar", authenticate, removeAvatar)
router.post("/change-password", authenticate, passwordLimiter, validate(changePasswordSchema), changePassword)

export default router