import type { RequestHandler } from "express"
import ApiError from "../utils/ApiError.js"
import { listQuerySchema } from "../validators/product.schema.js"
import * as productService from "../services/product.service.js"

export const list: RequestHandler = async (req, res) => {
  const data = await productService.listProducts(listQuerySchema.parse(req.query))
  res.json({ success: true, data })
}

export const listAll: RequestHandler = async (req, res) => {
  const data = await productService.listProducts(listQuerySchema.parse(req.query), true)
  res.json({ success: true, data })
}

export const getOne: RequestHandler<{ id: string }> = async (req, res) => {
  const product = await productService.getProduct(req.params.id)
  res.json({ success: true, data: { product } })
}

export const create: RequestHandler = async (req, res) => {
  const product = await productService.createProduct(req.body, req.file?.buffer)
  res.status(201).json({ success: true, message: "Product created", data: { product } })
}

export const update: RequestHandler<{ id: string }> = async (req, res) => {
  if (Object.keys(req.body).length === 0 && !req.file) {
    throw new ApiError(400, "Nothing to update")
  }
  const product = await productService.updateProduct(req.params.id, req.body, req.file?.buffer)
  res.json({ success: true, message: "Product updated", data: { product } })
}