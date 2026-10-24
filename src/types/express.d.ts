import type { User } from "../models/user.model.js"

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: User["role"] }
    }
  }
}

export {}