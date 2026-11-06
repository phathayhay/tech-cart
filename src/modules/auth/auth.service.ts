import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AccountStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import * as jwt from 'jsonwebtoken'
import { TokenReuseCompromiseException } from '../../common/exceptions/domain.exception'
import { AppEnvConfig } from '../../config/env.validation'
import { PrismaService } from '../../prisma/prisma.service'
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto
} from './dto/auth.dto'
import { PasswordService } from './password.service'

const MAX_FAILED_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService<AppEnvConfig, true>
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = dto.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    })
    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_EMAIL',
        message: 'Email này đã được đăng ký sử dụng'
      })
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password)
    const rawVerifyToken = this.signActionToken(normalizedEmail, 'VERIFY_EMAIL')
    const verifyTokenHash = this.passwordService.hashTokenSha256(rawVerifyToken)

    // Ensure CUSTOMER role exists
    const customerRole = await this.prisma.role.upsert({
      where: { code: 'CUSTOMER' },
      update: {},
      create: {
        code: 'CUSTOMER',
        name: 'Khách hàng',
        description: 'Khách hàng mua sắm đã đăng ký tài khoản'
      }
    })

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: dto.full_name.trim(),
          phone: dto.phone?.trim() || null,
          emailVerifyToken: verifyTokenHash,
          accountStatus: AccountStatus.ACTIVE
        }
      })

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: customerRole.id
        }
      })

      await tx.notificationPreference.create({
        data: {
          userId: createdUser.id
        }
      })

      return createdUser
    })

    const { roles, permissions } = await this.getUserRolesAndPermissions(user.id)
    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.fullName,
      roles,
      permissions,
      randomUUID(),
      ipAddress,
      userAgent
    )

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      email_verification_token_preview:
        process.env.NODE_ENV !== 'production' ? rawVerifyToken : undefined,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone,
        avatar_url: user.avatarUrl,
        account_status: user.accountStatus,
        roles,
        permissions
      }
    }
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = dto.email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác'
      })
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Tài khoản của bạn đã bị tạm khóa bởi quản trị viên'
      })
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new ForbiddenException({
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: `Tài khoản tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
      })
    }

    const { isValid, needsRehash } = await this.passwordService.verifyPassword(
      dto.password,
      user.passwordHash
    )

    if (!isValid) {
      const nextFailedCount = user.failedLoginCount + 1
      const shouldLock = nextFailedCount >= MAX_FAILED_LOGIN_ATTEMPTS
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextFailedCount,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null
        }
      })
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác'
      })
    }

    // Reset failed login counter & transparently upgrade legacy SHA-256 hash if needed
    const updatedPasswordHash = needsRehash
      ? await this.passwordService.hashPassword(dto.password)
      : undefined

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        ...(updatedPasswordHash ? { passwordHash: updatedPasswordHash } : {})
      }
    })

    const { roles, permissions } = await this.getUserRolesAndPermissions(user.id)
    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.fullName,
      roles,
      permissions,
      randomUUID(),
      ipAddress,
      userAgent
    )

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      password_upgraded_to_bcrypt: needsRehash,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone,
        avatar_url: user.avatarUrl,
        account_status: user.accountStatus,
        roles,
        permissions
      }
    }
  }

  async refreshTokens(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const refreshSecret = this.configService.get('JWT_SECRET_REFRESH_TOKEN', { infer: true })
    let decoded: jwt.JwtPayload & { sub?: string; familyId?: string; type?: string }

    try {
      decoded = jwt.verify(dto.refresh_token, refreshSecret) as jwt.JwtPayload & {
        sub?: string
        familyId?: string
        type?: string
      }
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token không hợp lệ hoặc đã hết hạn'
      })
    }

    const tokenHash = this.passwordService.hashTokenSha256(dto.refresh_token)
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    })

    if (!storedToken) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Không tìm thấy phiên đăng nhập tương ứng'
      })
    }

    // REUSE DETECTION: If this refresh token was already rotated/revoked, revoke the entire family!
    if (storedToken.isRevoked) {
      await this.prisma.$transaction([
        this.prisma.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { isRevoked: true }
        }),
        this.prisma.auditLog.create({
          data: {
            actorUserId: storedToken.userId,
            action: 'REFRESH_TOKEN_REUSE_COMPROMISE',
            entityType: 'RefreshTokenFamily',
            entityId: storedToken.familyId,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            afterState: { familyRevoked: true, reusedTokenId: storedToken.id }
          }
        })
      ])
      throw new TokenReuseCompromiseException()
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true }
      })
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'
      })
    }

    const user = storedToken.user
    if (user.accountStatus === AccountStatus.SUSPENDED || user.deletedAt) {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Tài khoản không còn hoạt động'
      })
    }

    const { roles, permissions } = await this.getUserRolesAndPermissions(user.id)

    // Rotate refresh token within the same familyId
    const newJti = randomUUID()
    const newAccessToken = this.signAccessToken(
      user.id,
      user.email,
      user.fullName,
      roles,
      permissions
    )
    const newRefreshToken = this.signRefreshToken(user.id, newJti, storedToken.familyId)
    const newTokenHash = this.passwordService.hashTokenSha256(newRefreshToken)

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          familyId: storedToken.familyId,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
        }
      })

      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          isRevoked: true,
          replacedById: created.id
        }
      })
    })

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken
    }
  }

  async logout(userId: string, dto: LogoutDto) {
    if (dto.all_devices) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true }
      })
      return { revoked_all_devices: true }
    }

    if (dto.refresh_token) {
      const tokenHash = this.passwordService.hashTokenSha256(dto.refresh_token)
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash },
        data: { isRevoked: true }
      })
    }
    return { revoked: true }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = this.passwordService.hashTokenSha256(dto.token)
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: tokenHash }
    })

    if (!user) {
      throw new BadRequestException({
        code: 'INVALID_VERIFY_TOKEN',
        message: 'Mã xác thực email không hợp lệ hoặc đã được sử dụng'
      })
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerifyToken: null,
        accountStatus: AccountStatus.ACTIVE
      }
    })

    return { verified: true, email: user.email }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    let devResetToken: string | undefined
    if (user && !user.deletedAt) {
      devResetToken = this.signActionToken(user.id, 'RESET_PASSWORD')
      const tokenHash = this.passwordService.hashTokenSha256(devResetToken)
      await this.prisma.user.update({
        where: { id: user.id },
        data: { forgotPassToken: tokenHash }
      })
    }

    return {
      sent: true,
      message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
      ...(process.env.NODE_ENV !== 'production' && devResetToken
        ? { reset_token_preview: devResetToken }
        : {})
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const secret = this.configService.get('JWT_SECRET_FORGOT_PASSWORD_TOKEN', { infer: true })
    try {
      jwt.verify(dto.token, secret)
    } catch {
      throw new BadRequestException({
        code: 'INVALID_RESET_TOKEN',
        message: 'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'
      })
    }

    const tokenHash = this.passwordService.hashTokenSha256(dto.token)
    const user = await this.prisma.user.findFirst({
      where: { forgotPassToken: tokenHash }
    })
    if (!user) {
      throw new BadRequestException({
        code: 'INVALID_RESET_TOKEN',
        message: 'Mã đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng'
      })
    }

    const newPasswordHash = await this.passwordService.hashPassword(dto.new_password)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          forgotPassToken: null,
          failedLoginCount: 0,
          lockedUntil: null
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true }
      })
    ])

    return { password_reset: true }
  }

  async getUserRolesAndPermissions(
    userId: string
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        }
      }
    })

    const roleSet = new Set<string>()
    const permSet = new Set<string>()
    for (const ur of userRoles) {
      roleSet.add(ur.role.code)
      for (const rp of ur.role.rolePermissions) {
        permSet.add(rp.permission.code)
      }
    }

    return {
      roles: Array.from(roleSet),
      permissions: Array.from(permSet)
    }
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    fullName: string,
    roles: string[],
    permissions: string[],
    familyId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const jti = randomUUID()
    const accessToken = this.signAccessToken(userId, email, fullName, roles, permissions)
    const refreshToken = this.signRefreshToken(userId, jti, familyId)
    const tokenHash = this.passwordService.hashTokenSha256(refreshToken)

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
      }
    })

    return { accessToken, refreshToken }
  }

  private signAccessToken(
    userId: string,
    email: string,
    fullName: string,
    roles: string[],
    permissions: string[]
  ): string {
    const secret = this.configService.get('JWT_SECRET_ACCESS_TOKEN', { infer: true })
    return jwt.sign(
      {
        sub: userId,
        email,
        fullName,
        roles,
        permissions,
        type: 'ACCESS'
      },
      secret,
      { expiresIn: '15m' }
    )
  }

  private signRefreshToken(userId: string, jti: string, familyId: string): string {
    const secret = this.configService.get('JWT_SECRET_REFRESH_TOKEN', { infer: true })
    return jwt.sign(
      {
        sub: userId,
        jti,
        familyId,
        type: 'REFRESH'
      },
      secret,
      { expiresIn: '7d' }
    )
  }

  private signActionToken(sub: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): string {
    const secret =
      purpose === 'VERIFY_EMAIL'
        ? this.configService.get('JWT_SECRET_EMAIL_VERIFY_TOKEN', { infer: true })
        : this.configService.get('JWT_SECRET_FORGOT_PASSWORD_TOKEN', { infer: true })
    return jwt.sign({ sub, purpose, jti: randomUUID() }, secret, { expiresIn: '15m' })
  }
}
