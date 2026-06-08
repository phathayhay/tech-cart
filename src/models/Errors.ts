import HTTP_STATUS from '~/constants/httpStatus'

//ở đây thường mình sẽ extend Error để nhận đc báo lỗi ở dòng nào
type ErrorType = Record<
  string,
  {
    msg: string
    [key: string]: any
  }
>

export class ErrorWithStatus {
  message: string
  status: number
  constructor({ message, status }: { message: string; status: number }) {
    this.message = message
    this.status = status
  }
}

//entityError la object loi hien tai
export class EntityError extends ErrorWithStatus {
  errors: ErrorType
  constructor({
    message = 'Validation Errors', //
    errors
  }: {
    message?: string //optional
    errors: ErrorType
  }) {
    super({ message, status: HTTP_STATUS.UNPROCESSABLE_ENTITY }) // new ErrorWithStatus
    this.errors = errors
  }
}
