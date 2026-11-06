import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import { Request, Response } from 'express'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface StandardEnvelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: Record<string, unknown>
  request_id: string
}

@Injectable()
export class RequestIdAndEnvelopeInterceptor<T>
  implements NestInterceptor<T, StandardEnvelope<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<StandardEnvelope<T> | T> {
    const http = context.switchToHttp()
    const request = http.getRequest<Request & { requestId?: string }>()
    const response = http.getResponse<Response>()

    const requestId =
      (request.headers['x-request-id'] as string) || `req_${randomUUID().replace(/-/g, '').slice(0, 18)}`
    request.requestId = requestId
    response.setHeader('X-Request-Id', requestId)

    return next.handle().pipe(
      map((payload: unknown) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'success' in (payload as Record<string, unknown>) &&
          'request_id' in (payload as Record<string, unknown>)
        ) {
          return payload as StandardEnvelope<T>
        }

        if (
          payload &&
          typeof payload === 'object' &&
          'data' in (payload as Record<string, unknown>) &&
          ('meta' in (payload as Record<string, unknown>) || 'message' in (payload as Record<string, unknown>))
        ) {
          const structured = payload as {
            message?: string
            data: T
            meta?: Record<string, unknown>
          }
          return {
            success: true,
            message: structured.message || 'OK',
            data: structured.data,
            ...(structured.meta ? { meta: structured.meta } : {}),
            request_id: requestId
          }
        }

        return {
          success: true,
          message: 'OK',
          data: payload as T,
          request_id: requestId
        }
      })
    )
  }
}

