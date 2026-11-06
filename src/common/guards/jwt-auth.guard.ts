import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { AppEnvConfig } from '../../config/env.validation'
import {
  AuthenticatedUser,
  IS_OPTIONAL_AUTH_KEY,
  IS_PUBLIC_KEY
} from '../decorators/auth.decorators'

export interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
  type: 'ACCESS'
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService<AppEnvConfig, true>
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ])
    const isOptional = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass()
    ])

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>()

    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isPublic || isOptional) {
        return true
      }
      throw new UnauthorizedException({
        code: 'MISSING_ACCESS_TOKEN',
        message: 'Vui lòng đăng nhập để thực hiện thao tác này (Missing Bearer Token)'
      })
    }

    const token = authHeader.slice(7).trim()
    try {
      const secret = this.configService.get('JWT_SECRET_ACCESS_TOKEN', { infer: true })
      const decoded = jwt.verify(token, secret) as AccessTokenPayload
      if (decoded.type !== 'ACCESS' || !decoded.sub) {
        throw new Error('Invalid token type')
      }

      request.user = {
        id: decoded.sub,
        email: decoded.email,
        fullName: decoded.fullName,
        roles: Array.isArray(decoded.roles) ? decoded.roles : [],
        permissions: Array.isArray(decoded.permissions) ? decoded.permissions : []
      }
      return true
    } catch {
      if (isPublic || isOptional) {
        return true
      }
      throw new UnauthorizedException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
      })
    }
  }
}
