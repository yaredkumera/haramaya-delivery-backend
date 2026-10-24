import type { HydratedDocument } from "mongoose"
import ProductModel from "../models/product.model.js"
import type { Product } from "../models/product.model.js"
import ApiError from "../utils/ApiError.js"
import { deleteImage, uploadProductImage } from "./cloudinary.service.js"
import type { UploadedImage } from "./cloudinary.service.js"
import type { CreateProductInput, ListQuery, UpdateProductInput } from "../validators/product.schema.js"

export type PublicProduct = Pick<
  Product,
  "name" | "description" | "price" | "imageUrl" | "category" | "market" | "badge" | "available"
> & { id: string }

const sorts = {
  newest: { createdAt: -1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
} as const

function toPublicProduct(product: HydratedDocument<Product>): PublicProduct {
  return {
    id: String(product._id),
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    category: product.category,
    market: product.market,
    badge: product.badge,
    available: product.available,
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const removeImage = (publicId: string) =>
  deleteImage(publicId).catch((error) => console.error("Could not delete image:", publicId, error))

export async function listProducts(query: ListQuery, includeHidden = false) {
  const filter = {
    ...(includeHidden ? {} : { available: true }),
    ...(query.category ? { category: query.category } : {}),
    ...(query.market ? { market: query.market } : {}),
    ...(query.search ? { name: { $regex: escapeRegex(query.search), $options: "i" } } : {}),
  }

  const [items, total] = await Promise.all([
    ProductModel.find(filter)
      .sort(sorts[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    ProductModel.countDocuments(filter),
  ])

  return {
    items: items.map(toPublicProduct),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  }
}

export async function getProduct(id: string): Promise<PublicProduct> {
  const product = await ProductModel.findById(id)

  if (!product || !product.available) {
    throw new ApiError(404, "Product not found")
  }

  return toPublicProduct(product)
}

export async function createProduct(
  input: CreateProductInput,
  image: Buffer | undefined,
): Promise<PublicProduct> {
  if (!image) throw new ApiError(400, "Product image is required")

  const uploaded = await uploadProductImage(image)

  try {
    const product = await ProductModel.create({
      ...input,
      imageUrl: uploaded.url,
      imagePublicId: uploaded.publicId,
    })
    return toPublicProduct(product)
  } catch (error) {
    await removeImage(uploaded.publicId)
    throw error
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  image: Buffer | undefined,
): Promise<PublicProduct> {
  const product = await ProductModel.findById(id).select("+imagePublicId")
  if (!product) throw new ApiError(404, "Product not found")

  const oldPublicId = product.imagePublicId
  const uploaded: UploadedImage | undefined = image ? await uploadProductImage(image) : undefined

  product.set({
    ...input,
    ...(uploaded ? { imageUrl: uploaded.url, imagePublicId: uploaded.publicId } : {}),
  })

  try {
    await product.save()
  } catch (error) {
    if (uploaded) await removeImage(uploaded.publicId)
    throw error
  }

  if (uploaded) await removeImage(oldPublicId)
  return toPublicProduct(product)
}