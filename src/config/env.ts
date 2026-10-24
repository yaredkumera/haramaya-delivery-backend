import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1),
  FRONTEND_URL:z.string().url(),
  JWT_SECRET: z.string().min(32),
NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
CLOUDINARY_CLOUD_NAME: z.string().min(1),
CLOUDINARY_API_KEY: z.string().min(1),
CLOUDINARY_API_SECRET: z.string().min(1),
AFROMESSAGE_TOKEN:z.string().min(1)
})
const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.issues)
  process.exit(1)
}

export const env = parsed.data