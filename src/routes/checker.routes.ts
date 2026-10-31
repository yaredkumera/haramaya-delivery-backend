import { timingSafeEqual } from "node:crypto"
import express, { Router } from "express"
import mongoose from "mongoose"
import { env } from "../config/env.js"
import { applyResult, pendingJobs } from "../services/checker.service.js"

const router = Router()

const same = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

router.use((req, res, next) => {
  const given = (req.headers.authorization ?? "").replace(/^Bearer /, "")
  if (!env.CHECKER_TOKEN || !same(given, env.CHECKER_TOKEN)) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }
  next()
})

router.get("/jobs", async (_req, res, next) => {
  try {
    res.json({ jobs: await pendingJobs() })
  } catch (error) {
    next(error)
  }
})

router.post("/jobs/:orderId/result", express.json({ limit: "2mb" }), async (req, res, next) => {
  try {
    const { orderId } = req.params
    if (!mongoose.isValidObjectId(orderId)) {
      res.status(400).json({ message: "Invalid order id" })
      return
    }
    const html = typeof req.body?.html === "string" ? req.body.html : null
    await applyResult(orderId, html)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

export default router