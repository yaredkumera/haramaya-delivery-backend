import type { RequestHandler } from "express"
import type { ZodType } from "zod"

const validate = (schema: ZodType): RequestHandler => (req, _res, next) => {
  req.body = schema.parse(req.body ?? {})
  next()
}

export default validate