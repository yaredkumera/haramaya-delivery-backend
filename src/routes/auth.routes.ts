import { Router } from "express"
import { login, me, register,google,updatePhone,forgotPassword,resetPassword } from "../controllers/auth.controller.js"
import validate from "../middleware/validate.js"
import { authenticate } from "../middleware/auth.js"
import {loginLimiter,registerLimiter,resetLimiter} from "../middleware/rateLimit.js"
import { googleSchema,updatePhoneSchema ,forgotSchema,resetSchema,loginSchema, registerSchema } from "../validators/auth.schema.js"
const router = Router()

router.post("/register",registerLimiter, validate(registerSchema), register)
router.post("/login",loginLimiter, validate(loginSchema), login)
router.get("/me", authenticate, me)
router.post("/google", loginLimiter, validate(googleSchema), google)
router.patch("/me", authenticate, validate(updatePhoneSchema), updatePhone)
router.post("/forgot-password", resetLimiter, validate(forgotSchema), forgotPassword)
router.post("/reset-password", resetLimiter, validate(resetSchema), resetPassword)
export default router