import CartModel from "../models/cart.model.js"
import ProductModel from "../models/product.model.js"
import ApiError from "../utils/ApiError.js"

// 1. Get user cart and populate product details
export async function getCart(userId: string) {
  let cart = await CartModel.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name description price imageUrl category market badge available",
  })

  if (!cart) {
    cart = await CartModel.create({ user: userId, items: [] })
  }

  return cart
}

// 2. Add product: Throws an error if it already exists in the cart
export async function addToCart(userId: string, productId: string, quantity: number) {
  const product = await ProductModel.findById(productId)
  if (!product || !product.available) {
    throw new ApiError(404, "Product not found or unavailable")
  }

  let cart = await CartModel.findOne({ user: userId })

  if (!cart) {
    cart = await CartModel.create({
      user: userId,
      items: [{ product: productId, quantity }],
    })
  } else {
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    )

    if (existingItem) {
      throw new ApiError(400, "Product already exists in cart")
    }

    cart.items.push({ product: productId, quantity } as any)
    await cart.save()
  }

  return getCart(userId)
}

// 3. Update cart item quantity
export async function updateCartItem(userId: string, productId: string, quantity: number) {
  const cart = await CartModel.findOne({ user: userId })
  if (!cart) {
    throw new ApiError(404, "Cart not found")
  }

  const item = cart.items.find((i) => i.product.toString() === productId)
  if (!item) {
    throw new ApiError(404, "Product not found in cart")
  }

  item.quantity = quantity
  await cart.save()

  return getCart(userId)
}

// 4. Remove item safely using Mongoose query to avoid array type mismatches
export async function removeCartItem(userId: string, productId: string) {
  const cart = await CartModel.findOneAndUpdate(
    { user: userId },
    { $pull: { items: { product: productId } } },
   { returnDocument: "after" }
  )

  if (!cart) {
    throw new ApiError(404, "Cart not found")
  }

  return getCart(userId)
}

// 5. Clear entire cart safely
export async function clearCart(userId: string) {
  const cart = await CartModel.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
   { returnDocument: "after" }
  )

  if (!cart) {
    throw new ApiError(404, "Cart not found")
  }

  return getCart(userId)
}