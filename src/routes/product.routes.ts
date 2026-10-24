import { Router } from "express"
import { authenticate, requireRole } from "../middleware/auth.js"
import { uploadImage } from "../middleware/upload.js"
import validate from "../middleware/validate.js"
import { createProductSchema, updateProductSchema } from "../validators/product.schema.js"
import { create, getOne, list, listAll, update } from "../controllers/product.controller.js"

const router = Router()
const adminOnly = [authenticate, requireRole("admin")]

router.get("/", list)
router.get("/admin/all", ...adminOnly, listAll)
router.get("/:id", getOne)

router.post("/", ...adminOnly, uploadImage, validate(createProductSchema), create)
router.patch("/:id", ...adminOnly, uploadImage, validate(updateProductSchema), update)

export default router