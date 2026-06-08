import express from 'express'
import { createOrderController, getOrdersController } from '~/controllers/orders.controllers'
import { accessTokenValidator } from '~/middlewares/users.middleware'
import { wrapAsync } from '~/utils/handler'

const ordersRoutes = express.Router()

ordersRoutes.post('/', accessTokenValidator, wrapAsync(createOrderController))
ordersRoutes.get('/', accessTokenValidator, wrapAsync(getOrdersController))

export default ordersRoutes
