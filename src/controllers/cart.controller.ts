import type { RequestHandler } from "express"
import * as cartService from "../services/cart.service.js"
import { getAuthUser } from "../utils/getAuthUser.js"

export const getCart: RequestHandler = async (req, res) => {
  const userId = getAuthUser(req).id
  const cart = await cartService.getCart(userId)
  res.json({ success: true, data: cart })
}

export const addToCart: RequestHandler = async (req, res) => {
  const userId = getAuthUser(req).id
  const { productId, quantity } = req.body
  const cart = await cartService.addToCart(userId, productId, quantity)
  res.status(201).json({ success: true, message: "Product added to cart", data: cart })
}

export const updateItem: RequestHandler = async (req, res) => {
  const userId = getAuthUser(req).id
  const { productId, quantity } = req.body
  const cart = await cartService.updateCartItem(userId, productId, quantity)
  res.json({ success: true, message: "Cart item updated", data: cart })
}

export const removeItem: RequestHandler<{ productId: string }> = async (req, res) => {
  const userId = getAuthUser(req).id
  const cart = await cartService.removeCartItem(userId, req.params.productId)
  res.json({ success: true, message: "Item removed from cart", data: cart })
}

export const clear: RequestHandler = async (req, res) => {
  const userId = getAuthUser(req).id
  const cart = await cartService.clearCart(userId)
  res.json({ success: true, message: "Cart cleared", data: cart })
}