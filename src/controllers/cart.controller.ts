import type { RequestHandler } from "express"
import * as cartService from "../services/cart.service.js"
import { getAuthUser } from "../utils/getAuthUser.js"
import { productIdSchema } from "../validators/cart.schema.js"
import type { AddToCartInput, UpdateCartItemInput } from "../validators/cart.schema.js"

export const getCart: RequestHandler = async (req, res) => {
  const cart = await cartService.getCart(getAuthUser(req).id)
  res.json({ success: true, data: cart })
}

export const addToCart: RequestHandler = async (req, res) => {
  const { productId, quantity }: AddToCartInput = req.body
  const cart = await cartService.addToCart(getAuthUser(req).id, productId, quantity)
  res.status(201).json({ success: true, message: "Product added to cart", data: cart })
}

export const updateItem: RequestHandler = async (req, res) => {
  const { productId, quantity }: UpdateCartItemInput = req.body
  const cart = await cartService.updateCartItem(getAuthUser(req).id, productId, quantity)
  res.json({ success: true, message: "Cart item updated", data: cart })
}

export const removeItem: RequestHandler<{ productId: string }> = async (req, res) => {
  const productId = productIdSchema.parse(req.params.productId)
  const cart = await cartService.removeCartItem(getAuthUser(req).id, productId)
  res.json({ success: true, message: "Item removed from cart", data: cart })
}
export const clear: RequestHandler = async (req, res) => {
  const cart = await cartService.clearCart(getAuthUser(req).id)
  res.json({ success: true, message: "Cart cleared", data: cart })
}