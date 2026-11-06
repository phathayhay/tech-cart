import { HttpException, HttpStatus } from '@nestjs/common'

export interface ErrorDetailItem {
  field?: string
  message?: string
  [key: string]: unknown
}

export class DomainException extends HttpException {
  public readonly code: string
  public readonly details?: ErrorDetailItem[]

  constructor(
    code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    details?: ErrorDetailItem[]
  ) {
    super({ code, message, status_code: statusCode, details }, statusCode)
    this.code = code
    this.details = details
  }
}

export class InsufficientStockException extends DomainException {
  constructor(message: string, details?: ErrorDetailItem[]) {
    super('INSUFFICIENT_STOCK', message, HttpStatus.UNPROCESSABLE_ENTITY, details)
  }
}

export class InvalidVoucherException extends DomainException {
  constructor(message: string, details?: ErrorDetailItem[]) {
    super('INVALID_VOUCHER', message, HttpStatus.BAD_REQUEST, details)
  }
}

export class IllegalOrderStateException extends DomainException {
  constructor(fromStatus: string, toStatus: string) {
    super(
      'ILLEGAL_ORDER_TRANSITION',
      `Cannot transition order from ${fromStatus} to ${toStatus}`,
      HttpStatus.UNPROCESSABLE_ENTITY
    )
  }
}

export class TokenReuseCompromiseException extends DomainException {
  constructor() {
    super(
      'TOKEN_REUSE_DETECTED',
      'Refresh token reuse detected. All active sessions in this token family have been revoked for security.',
      HttpStatus.UNAUTHORIZED
    )
  }
}

