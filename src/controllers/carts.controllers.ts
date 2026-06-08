import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { SHOPPING_MESSAGES } from '~/constants/shoppingMessages'
import { TokenPayLoad } from '~/models/request/User.requests'
import { AddToCartReqBody, UpdateCartReqBody } from '~/models/request/Shopping.requests'
import cartsServices from '~/services/carts.services'

export const getCartController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const cart = await cartsServices.getCart(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.GET_CART_SUCCESS,
    result: cart
  })
}

export const addToCartController = async (
  req: Request<ParamsDictionary, any, AddToCartReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { product_id, quantity } = req.body
  const cart = await cartsServices.addToCart(user_id, product_id, quantity)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.ADD_TO_CART_SUCCESS,
    result: cart
  })
}

export const updateCartController = async (
  req: Request<ParamsDictionary, any, UpdateCartReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { product_id, quantity } = req.body
  const cart = await cartsServices.updateCartItem(user_id, product_id, quantity)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.UPDATE_CART_SUCCESS,
    result: cart
  })
}

export const removeFromCartController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { product_id } = req.params
  const cart = await cartsServices.removeFromCart(user_id, product_id)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.REMOVE_FROM_CART_SUCCESS,
    result: cart
  })
}

export const clearCartController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const cart = await cartsServices.clearCart(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.CLEAR_CART_SUCCESS,
    result: cart
  })
}
