import { ObjectId } from 'mongodb'
import { SHOPPING_MESSAGES } from '~/constants/shoppingMessages'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from './database.services'

class ProductsServices {
  async getAllProducts() {
    const products = await databaseServices.products.find({}).sort({ created_at: -1 }).toArray()
    return products.filter((p) => p.is_active !== false)
  }

  async getProductById(product_id: string) {
    const product = await databaseServices.products.findOne({
      _id: new ObjectId(product_id),
      is_active: true
    })
    if (!product) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: SHOPPING_MESSAGES.PRODUCT_NOT_FOUND
      })
    }
    return product
  }
}

const productsServices = new ProductsServices()
export default productsServices
