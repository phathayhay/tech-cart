import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Request, Response } from 'express'
import { DomainException } from '../exceptions/domain.exception'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request & { requestId?: string }>()
    const requestId = request.requestId || (request.headers['x-request-id'] as string) || 'req_unknown'

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let code = 'INTERNAL_ERROR'
    let message = 'An unexpected internal server error occurred'
    let details: unknown = undefined

    if (exception instanceof DomainException) {
      statusCode = exception.getStatus()
      code = exception.code
      message = exception.message
      details = exception.details
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const resBody = exception.getResponse()
      if (typeof resBody === 'string') {
        message = resBody
        code = this.mapStatusToCode(statusCode)
      } else if (typeof resBody === 'object' && resBody !== null) {
        const bodyObj = resBody as Record<string, unknown>
        code = (bodyObj.code as string) || this.mapStatusToCode(statusCode)
        if (Array.isArray(bodyObj.message)) {
          message = 'Request validation failed'
          details = bodyObj.message.map((msg) => ({ message: String(msg) }))
          code = 'VALIDATION_ERROR'
        } else {
          message = (bodyObj.message as string) || exception.message
          details = bodyObj.details
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`[${requestId}] Unhandled Error: ${exception.message}`, exception.stack)
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message
      }
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        status_code: statusCode,
        ...(details ? { details } : {})
      },
      request_id: requestId,
      timestamp: new Date().toISOString()
    })
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST'
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED'
      case HttpStatus.FORBIDDEN:
        return 'INSUFFICIENT_PERMISSIONS'
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND'
      case HttpStatus.CONFLICT:
        return 'CONFLICT'
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY'
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED'
      default:
        return 'INTERNAL_ERROR'
    }
  }
}

