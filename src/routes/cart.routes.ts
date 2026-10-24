import { Router } from "express"
import { authenticate } from "../middleware/auth.js"
import validate from "../middleware/validate.js"
import { addToCartSchema, updateCartItemSchema } from "../validators/cart.schema.js"
import { getCart, addToCart, updateItem, removeItem, clear } from "../controllers/cart.controller.js"

const router = Router()

// All cart routes require a user to be authenticated (logged in)
router.use(authenticate)

router.get("/", getCart)
router.post("/", validate(addToCartSchema), addToCart)
router.patch("/", validate(updateCartItemSchema), updateItem)
router.delete("/item/:productId", removeItem)
router.delete("/", clear)

export default router