import express from 'express'
import {
  addToCartController,
  clearCartController,
  getCartController,
  removeFromCartController,
  updateCartController
} from '~/controllers/carts.controllers'
import { accessTokenValidator } from '~/middlewares/users.middleware'
import { cartItemValidator, productIdParamValidator } from '~/middlewares/shopping.middleware'
import { wrapAsync } from '~/utils/handler'

const cartsRoutes = express.Router()

cartsRoutes.get('/', accessTokenValidator, wrapAsync(getCartController))
cartsRoutes.post('/add', accessTokenValidator, cartItemValidator, wrapAsync(addToCartController))
cartsRoutes.post('/update', accessTokenValidator, cartItemValidator, wrapAsync(updateCartController))
cartsRoutes.delete(
  '/remove/:product_id',
  accessTokenValidator,
  productIdParamValidator,
  wrapAsync(removeFromCartController)
)
cartsRoutes.delete('/clear', accessTokenValidator, wrapAsync(clearCartController))

export default cartsRoutes
