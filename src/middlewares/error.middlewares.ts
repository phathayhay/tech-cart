import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'

export const defaultErrorHandler = (
  err: any, //
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // loi error co the la bat cu dang loi nao, minh kh the luong truoc dc
  // neu la loi do minh chu dich tao ra thi no la ErrorWithStatus va co status
  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(omit(err, ['status']))
  }

  // neu la loi khac thi phai dua cac property ve enumrable true
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })

  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(omit(err, ['stack']))
}
