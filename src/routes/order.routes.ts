import { Router } from "express"
import { authenticate } from "../middleware/auth.js"
import { checkoutLimiter } from "../middleware/rateLimit.js"
import validate from "../middleware/validate.js"
import { checkoutSchema } from "../validators/order.schema.js"
import { checkout, getMine, listMine, paymentInfo } from "../controllers/order.controller.js"

const router = Router()
router.use(authenticate)

router.get("/payment-info", paymentInfo)
router.post("/", checkoutLimiter, validate(checkoutSchema), checkout)
router.get("/", listMine)
router.get("/:id", getMine)

export default router