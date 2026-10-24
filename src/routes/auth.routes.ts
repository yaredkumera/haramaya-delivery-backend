import { Router } from "express"
import { login, me, register } from "../controllers/auth.controller.js"
import validate from "../middleware/validate.js"
import { loginSchema, registerSchema } from "../validators/auth.schema.js"
import { authenticate } from "../middleware/auth.js"
import {loginLimiter} from "../middleware/rateLimit.js"
import {registerLimiter} from "../middleware/rateLimit.js"
const router = Router()

router.post("/register",registerLimiter, validate(registerSchema), register)
router.post("/login",loginLimiter, validate(loginSchema), login)
router.get("/me", authenticate, me)
export default router