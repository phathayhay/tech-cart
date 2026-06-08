import { NextFunction, Request, Response } from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req) // chay checkSchema va luu loi vao req
    const error = validationResult(req) // khui loi ra
    // neu kh co loi thi qua buoc tiep theo, kh check nua
    if (error.isEmpty()) {
      return next()
    }
    // neu co loi thi tong hop loi lai
    // hau het cac loi la 422
    const errorObject = error.mapped() // day la thg loi ban dau (dac diem la chua dc dep mat)
    const entityError = new EntityError({
      errors: {}
    }) // day la loi co cau truc on dinh ma muon tra ve

    // se override lai cai errorObject nay
    for (const key in errorObject) {
      const { msg } = errorObject[key]
      if (
        msg instanceof ErrorWithStatus &&
        msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY //422
      ) {
        return next(msg) // nem ve ErrorHandler tong
      }
      entityError.errors[key] = msg
    }
    return next(entityError)
  }
}
