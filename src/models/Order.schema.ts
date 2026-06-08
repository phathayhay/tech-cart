import { ObjectId } from 'mongodb'
import { OrderStatus, PaymentMethod, PaymentStatus } from '~/constants/enums'
import { CartItem } from './Cart.schema'

// Snapshot sản phẩm tại thời điểm đặt hàng
export interface OrderItem extends CartItem {
  product_id: ObjectId
  name: string
  image_url: string
  price: number // giá tại thời điểm mua
  quantity: number
}

interface OrderType {
  _id?: ObjectId
  user_id: ObjectId
  items: OrderItem[]
  total_amount: number
  status?: OrderStatus
  payment_method?: PaymentMethod
  payment_status?: PaymentStatus
  paid_at?: Date | null
  status_history?: OrderStatusHistory[]
  shipping_address?: string
  note?: string
  created_at?: Date
  updated_at?: Date
}

export interface OrderStatusHistory {
  status: OrderStatus
  changed_at: Date
  note?: string
}

export default class Order {
  _id?: ObjectId
  user_id: ObjectId
  items: OrderItem[]
  total_amount: number
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  paid_at: Date | null
  status_history: OrderStatusHistory[]
  shipping_address: string
  note: string
  created_at: Date
  updated_at: Date

  constructor(order: OrderType) {
    const now = new Date()
    this._id = order._id || new ObjectId()
    this.user_id = order.user_id
    this.items = order.items
    this.total_amount = order.total_amount
    this.status = order.status || OrderStatus.Pending
    this.payment_method = order.payment_method || PaymentMethod.COD
    this.payment_status = order.payment_status || PaymentStatus.Pending
    this.paid_at = order.paid_at || null
    this.status_history = order.status_history || [
      {
        status: this.status,
        changed_at: now,
        note: 'Order created'
      }
    ]
    this.shipping_address = order.shipping_address || ''
    this.note = order.note || ''
    this.created_at = order.created_at || now
    this.updated_at = order.updated_at || now
  }
}
