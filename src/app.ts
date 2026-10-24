import notFound from "./middleware/notFound.js"
import { errorHandler } from "./middleware/errorHandler.js"
import ApiError from "./utils/ApiError.js"
import express from "express"
import helmet from "helmet"
import cors from "cors"
import {env} from "./config/env.js"
import authRouter from "./routes/auth.routes.js"
import productRouter from "./routes/product.routes.js"
import cartRoutes from "./routes/cart.routes.js"
const app = express()
app.use(helmet())
if (env.NODE_ENV === "production") app.set("trust proxy", 1)
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: "10kb" }))
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Haramaya Delivery Backend is running" })
})
app.use("/api/auth", authRouter)
app.use("/api/products",productRouter)
app.use("/api/cart", cartRoutes)
app.use(notFound)
app.use(errorHandler)
export default app