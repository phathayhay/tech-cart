import express from 'express'
import { getProductByIdController, getProductsController } from '~/controllers/products.controllers'
import { productDetailParamValidator } from '~/middlewares/shopping.middleware'
import { wrapAsync } from '~/utils/handler'

const productsRoutes = express.Router()

productsRoutes.get('/', wrapAsync(getProductsController))
productsRoutes.get('/:id', productDetailParamValidator, wrapAsync(getProductByIdController))

export default productsRoutes
