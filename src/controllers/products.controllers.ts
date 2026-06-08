import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { SHOPPING_MESSAGES } from '~/constants/shoppingMessages'
import productsServices from '~/services/products.services'

export const getProductsController = async (req: Request, res: Response) => {
  const products = await productsServices.getAllProducts()
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.GET_PRODUCTS_SUCCESS,
    result: products
  })
}

export const getProductByIdController = async (
  req: Request<ParamsDictionary, any, any, any>,
  res: Response
) => {
  const { id } = req.params
  const product = await productsServices.getProductById(id)
  return res.status(HTTP_STATUS.OK).json({
    message: SHOPPING_MESSAGES.GET_PRODUCT_SUCCESS,
    result: product
  })
}
