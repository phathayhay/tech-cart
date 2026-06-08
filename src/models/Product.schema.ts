import { ObjectId } from 'mongodb'
import { ProductCategory } from '~/constants/enums'

interface ProductType {
  _id?: ObjectId
  name: string
  description: string
  price: number // VND
  original_price: number // giá gốc để tính % giảm
  stock: number // số lượng tồn kho
  category: ProductCategory
  image_url: string
  images?: string[] // ảnh phụ
  brand: string
  rating?: number // 0-5
  sold_count?: number // số lượng đã bán
  is_active?: boolean
  created_at?: Date
  updated_at?: Date
}

export default class Product {
  _id?: ObjectId
  name: string
  description: string
  price: number
  original_price: number
  stock: number
  category: ProductCategory
  image_url: string
  images: string[]
  brand: string
  rating: number
  sold_count: number
  is_active: boolean
  created_at: Date
  updated_at: Date

  constructor(product: ProductType) {
    const now = new Date()
    this._id = product._id || new ObjectId()
    this.name = product.name
    this.description = product.description
    this.price = product.price
    this.original_price = product.original_price || product.price
    this.stock = product.stock
    this.category = product.category
    this.image_url = product.image_url
    this.images = product.images || []
    this.brand = product.brand
    this.rating = product.rating ?? 4.5
    this.sold_count = product.sold_count ?? 0
    this.is_active = product.is_active ?? true
    this.created_at = product.created_at || now
    this.updated_at = product.updated_at || now
  }
}
