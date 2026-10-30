import { Router } from "express"
import { authenticate, requireRole } from "../middleware/auth.js"
import validate from "../middleware/validate.js"
import { rejectSchema } from "../validators/order.schema.js"
import { adminList, approve, cancel, collect, ready, reject,recheck ,byCode} from "../controllers/order.controller.js"

const router = Router()
router.use(authenticate, requireRole("admin"))

router.get("/", adminList)
router.get("/pickup/:code", byCode)
router.patch("/:id/approve", approve)
router.patch("/:id/reject", validate(rejectSchema), reject)
router.patch("/:id/ready", ready)
router.patch("/:id/collect", collect)
router.patch("/:id/cancel", cancel)
router.patch("/:id/recheck", recheck)
export default router