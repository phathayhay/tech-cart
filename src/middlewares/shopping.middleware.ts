import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { SHOPPING_MESSAGES } from '~/constants/shoppingMessages'
import { validate } from '~/utils/validation'

export const cartItemValidator = validate(
  checkSchema(
    {
      product_id: {
        notEmpty: { errorMessage: SHOPPING_MESSAGES.PRODUCT_ID_IS_REQUIRED },
        isString: true,
        custom: {
          options: (value) => {
            if (!ObjectId.isValid(value)) {
              throw new Error('Invalid product id')
            }
            return true
          }
        }
      },
      quantity: {
        notEmpty: { errorMessage: SHOPPING_MESSAGES.QUANTITY_IS_REQUIRED },
        isInt: {
          options: { min: 1 },
          errorMessage: SHOPPING_MESSAGES.QUANTITY_MUST_BE_POSITIVE
        }
      }
    },
    ['body']
  )
)

export const productIdParamValidator = validate(
  checkSchema(
    {
      product_id: {
        in: ['params'],
        notEmpty: { errorMessage: SHOPPING_MESSAGES.PRODUCT_ID_IS_REQUIRED },
        custom: {
          options: (value) => {
            if (!ObjectId.isValid(value)) {
              throw new Error('Invalid product id')
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

export const productDetailParamValidator = validate(
  checkSchema(
    {
      id: {
        in: ['params'],
        notEmpty: { errorMessage: SHOPPING_MESSAGES.PRODUCT_ID_IS_REQUIRED },
        custom: {
          options: (value) => {
            if (!ObjectId.isValid(value)) {
              throw new Error('Invalid product id')
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)
