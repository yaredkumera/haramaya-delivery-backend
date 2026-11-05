import { Router } from "express"
import { authenticate, requireRole } from "../middleware/auth.js"
import { block, list, remove, unblock } from "../controllers/user.admin.controller.js"
import { resetLink } from "../controllers/user.admin.controller.js"
const router = Router()
router.use(authenticate, requireRole("admin"))

router.get("/", list)
router.patch("/:id/block", block)
router.patch("/:id/unblock", unblock)
router.delete("/:id", remove)
router.post("/:id/reset-link", resetLink)
export default router