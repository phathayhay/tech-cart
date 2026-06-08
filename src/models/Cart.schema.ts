import { ObjectId } from 'mongodb'

// Mỗi item trong giỏ hàng
export interface CartItem {
  product_id: ObjectId
  name: string
  image_url: string
  price: number
  quantity: number
}

interface CartType {
  _id?: ObjectId
  user_id: ObjectId
  items: CartItem[]
  created_at?: Date
  updated_at?: Date
}

export default class Cart {
  _id?: ObjectId
  user_id: ObjectId
  items: CartItem[]
  created_at: Date
  updated_at: Date

  constructor(cart: CartType) {
    const now = new Date()
    this._id = cart._id || new ObjectId()
    this.user_id = cart.user_id
    this.items = cart.items || []
    this.created_at = cart.created_at || now
    this.updated_at = cart.updated_at || now
  }

  // Tính tổng tiền
  get total(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }
}
