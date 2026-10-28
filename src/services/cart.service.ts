import type { HydratedDocument } from "mongoose"
import CartModel, { MAX_CART_QUANTITY } from "../models/cart.model.js"
import ProductModel from "../models/product.model.js"
import type { Product } from "../models/product.model.js"
import ApiError from "../utils/ApiError.js"
import { toPublicProduct } from "./product.service.js"

async function findOrCreateCart(userId: string) {
  const cart = await CartModel.findOne({ user: userId })
  return cart ?? (await CartModel.create({ user: userId, items: [] }))
}

export async function getCart(userId: string) {
  const cart = await (await findOrCreateCart(userId)).populate("items.product")

  const items = cart.items.flatMap((item) => {
    const product = item.product as unknown as HydratedDocument<Product> | null
    return product ? [{ product: toPublicProduct(product), quantity: item.quantity }] : []
  })

  const total = items
    .filter((item) => item.product.available)
    .reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return { items, total }
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const product = await ProductModel.findById(productId)
  if (!product || !product.available) {
    throw new ApiError(404, "Product not found or unavailable")
  }

  const cart = await findOrCreateCart(userId)
  const existing = cart.items.find((item) => String(item.product) === productId)

  if (existing) existing.quantity = Math.min(existing.quantity + quantity, MAX_CART_QUANTITY)
  else cart.items.push({ product: product._id, quantity })

  await cart.save()
  return getCart(userId)
}

export async function updateCartItem(userId: string, productId: string, quantity: number) {
  const cart = await findOrCreateCart(userId)
  const item = cart.items.find((i) => String(i.product) === productId)
  if (!item) throw new ApiError(404, "Product is not in your cart")

  item.quantity = quantity
  await cart.save()
  return getCart(userId)
}

export async function removeCartItem(userId: string, productId: string) {
  await CartModel.updateOne({ user: userId }, { $pull: { items: { product: productId } } })
  return getCart(userId)
}

export async function clearCart(userId: string) {
  await CartModel.updateOne({ user: userId }, { $set: { items: [] } })
  return getCart(userId)
}