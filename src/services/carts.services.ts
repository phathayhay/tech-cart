import { ObjectId } from 'mongodb'
import { SHOPPING_MESSAGES } from '~/constants/shoppingMessages'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import Cart, { CartItem } from '~/models/Cart.schema'
import databaseServices from './database.services'
import productsServices from './products.services'

class CartsServices {
  private async getOrCreateCart(user_id: string): Promise<Cart> {
    let cart: Cart | null = await databaseServices.carts.findOne({
      user_id: new ObjectId(user_id)
    })
    if (!cart) {
      const newCart = new Cart({ user_id: new ObjectId(user_id), items: [] })
      await databaseServices.carts.insertOne(newCart as any)
      cart = newCart
    }
    return cart
  }

  async getCart(user_id: string) {
    const cart = await this.getOrCreateCart(user_id)
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return { ...cart, total }
  }

  async addToCart(user_id: string, product_id: string, quantity: number) {
    const product = await productsServices.getProductById(product_id)
    if (product.stock < quantity) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: SHOPPING_MESSAGES.INSUFFICIENT_STOCK
      })
    }

    const cart = await this.getOrCreateCart(user_id)
    const productObjectId = new ObjectId(product_id)
    const existingIndex = cart.items.findIndex((item) => item.product_id.toString() === product_id)

    let updatedItems: CartItem[]
    if (existingIndex >= 0) {
      const newQty = cart.items[existingIndex].quantity + quantity
      if (product.stock < newQty) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: SHOPPING_MESSAGES.INSUFFICIENT_STOCK
        })
      }
      updatedItems = cart.items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: newQty } : item
      )
    } else {
      updatedItems = [
        ...cart.items,
        {
          product_id: productObjectId,
          name: product.name,
          image_url: product.image_url,
          price: product.price,
          quantity
        }
      ]
    }

    await databaseServices.carts.updateOne(
      { user_id: new ObjectId(user_id) },
      { $set: { items: updatedItems, updated_at: new Date() } }
    )

    return this.getCart(user_id)
  }

  async updateCartItem(user_id: string, product_id: string, quantity: number) {
    const product = await productsServices.getProductById(product_id)
    if (product.stock < quantity) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: SHOPPING_MESSAGES.INSUFFICIENT_STOCK
      })
    }

    const cart = await this.getOrCreateCart(user_id)
    const itemIndex = cart.items.findIndex((item) => item.product_id.toString() === product_id)
    if (itemIndex === -1) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: SHOPPING_MESSAGES.PRODUCT_NOT_FOUND
      })
    }

    const updatedItems = cart.items.map((item, idx) =>
      idx === itemIndex ? { ...item, quantity } : item
    )

    await databaseServices.carts.updateOne(
      { user_id: new ObjectId(user_id) },
      { $set: { items: updatedItems, updated_at: new Date() } }
    )

    return this.getCart(user_id)
  }

  async removeFromCart(user_id: string, product_id: string) {
    const cart = await this.getOrCreateCart(user_id)
    const updatedItems = cart.items.filter((item) => item.product_id.toString() !== product_id)

    await databaseServices.carts.updateOne(
      { user_id: new ObjectId(user_id) },
      { $set: { items: updatedItems, updated_at: new Date() } }
    )

    return this.getCart(user_id)
  }

  async clearCart(user_id: string) {
    await databaseServices.carts.updateOne(
      { user_id: new ObjectId(user_id) },
      { $set: { items: [], updated_at: new Date() } }
    )
    return this.getCart(user_id)
  }
}

const cartsServices = new CartsServices()
export default cartsServices
