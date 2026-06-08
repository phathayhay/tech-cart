import { ObjectId } from 'mongodb'
import { OrderStatus, PaymentMethod, PaymentStatus } from '~/constants/enums'
import { SHOPPING_MESSAGES } from '~/constants/shoppingMessages'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import Order from '~/models/Order.schema'
import { CreateOrderReqBody } from '~/models/request/Shopping.requests'
import databaseServices from './database.services'
import cartsServices from './carts.services'

class OrdersServices {
  async createOrder(user_id: string, payload: CreateOrderReqBody = {}) {
    const cart = await cartsServices.getCart(user_id)
    if (!cart.items || cart.items.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: SHOPPING_MESSAGES.CART_IS_EMPTY
      })
    }

    for (const item of cart.items) {
      const product = await databaseServices.products.findOne({
        _id: new ObjectId(item.product_id.toString())
      })
      if (!product) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.NOT_FOUND,
          message: SHOPPING_MESSAGES.PRODUCT_NOT_FOUND
        })
      }
      if (product.stock < item.quantity) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: `${SHOPPING_MESSAGES.INSUFFICIENT_STOCK}: ${product.name}`
        })
      }
    }

    const total_amount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const payment_method = this.getPaymentMethod(payload.payment_method)
    const payment_status = payment_method === PaymentMethod.COD ? PaymentStatus.Pending : PaymentStatus.Paid
    const status = payment_method === PaymentMethod.COD ? OrderStatus.Pending : OrderStatus.Processing
    const paid_at = payment_status === PaymentStatus.Paid ? new Date() : null
    const order = new Order({
      user_id: new ObjectId(user_id),
      items: cart.items.map((item) => ({
        product_id: new ObjectId(item.product_id.toString()),
        name: item.name,
        image_url: item.image_url,
        price: item.price,
        quantity: item.quantity
      })),
      total_amount,
      status,
      payment_method,
      payment_status,
      paid_at,
      shipping_address: payload.shipping_address || '',
      note: payload.note || '',
      status_history: [
        {
          status,
          changed_at: new Date(),
          note:
            payment_status === PaymentStatus.Paid
              ? 'Order created and mock payment captured'
              : 'Order created, awaiting payment on delivery'
        }
      ]
    })

    await databaseServices.orders.insertOne(order as any)

    for (const item of cart.items) {
      const product = await databaseServices.products.findOne({
        _id: new ObjectId(item.product_id.toString())
      })
      if (product) {
        await databaseServices.products.updateOne(
          { _id: product._id },
          {
            $set: {
              stock: product.stock - item.quantity,
              sold_count: (product.sold_count || 0) + item.quantity,
              updated_at: new Date()
            }
          }
        )
      }
    }

    await cartsServices.clearCart(user_id)
    return order
  }

  private getPaymentMethod(method?: string) {
    if (method === PaymentMethod.Card) return PaymentMethod.Card
    if (method === PaymentMethod.BankTransfer) return PaymentMethod.BankTransfer
    return PaymentMethod.COD
  }

  async getOrders(user_id: string) {
    const orders = await databaseServices.orders
      .find({ user_id: new ObjectId(user_id) })
      .sort({ created_at: -1 })
      .toArray()
    return orders
  }
}

const ordersServices = new OrdersServices()
export default ordersServices
