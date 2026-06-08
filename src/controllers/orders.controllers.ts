import { Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { SHOPPING_MESSAGES } from '~/constants/shoppingMessages'
import { TokenPayLoad } from '~/models/request/User.requests'
import ordersServices from '~/services/orders.services'

export const createOrderController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const order = await ordersServices.createOrder(user_id, req.body)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.CREATE_ORDER_SUCCESS,
    result: order
  })
}

export const getOrdersController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const orders = await ordersServices.getOrders(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.GET_ORDERS_SUCCESS,
    result: orders
  })
}
