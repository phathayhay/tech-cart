import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  AuthenticatedUser,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY
} from '../decorators/auth.decorators'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    )
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ])

    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredRoles || requiredRoles.length === 0)
    ) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Bạn không có quyền truy cập tài nguyên này'
      })
    }

    // SUPER_ADMIN has full system access
    if (user.roles.includes('SUPER_ADMIN')) {
      return true
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((r) => user.roles.includes(r))
      if (!hasRole) {
        throw new ForbiddenException({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Yêu cầu một trong các vai trò: ${requiredRoles.join(', ')}`
        })
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPerms = requiredPermissions.every((perm) =>
        user.permissions.includes(perm)
      )
      if (!hasAllPerms) {
        throw new ForbiddenException({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Thiếu quyền truy cập bắt buộc: ${requiredPermissions.join(', ')}`
        })
      }
    }

    return true
  }
}
