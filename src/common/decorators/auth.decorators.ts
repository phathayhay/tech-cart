import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { Request } from 'express'

export const IS_PUBLIC_KEY = 'isPublic'
export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth'
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions'
export const REQUIRED_ROLES_KEY = 'requiredRoles'

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true)
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions)
export const RequireRoles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES_KEY, roles)

export interface AuthenticatedUser {
  id: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
}

export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>()
    const user = request.user
    if (!user) return undefined
    return field ? user[field] : user
  }
)

