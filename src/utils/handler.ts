import { NextFunction, Request, RequestHandler, Response } from 'express'
// wrapperAsync bien nhung ham  Async thanh ham co cau truc catch + next

export const wrapAsync = <P, T>(func: RequestHandler<P, any, any, T>) => {
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
