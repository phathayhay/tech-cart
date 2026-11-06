import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService } from '../auth/auth.service'
import { PasswordService } from '../auth/password.service'
import {
  ChangePasswordDto,
  CreateAddressDto,
  UpdateAddressDto,
  UpdateProfileDto
} from './dto/users.dto'

const MAX_SAVED_ADDRESSES = 10

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
        },
        notificationPref: true
      }
    })

    if (!user || user.deletedAt) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy thông tin người dùng'
      })
    }

    const { roles, permissions } = await this.authService.getUserRolesAndPermissions(userId)

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.fullName,
      phone: user.phone,
      avatar_url: user.avatarUrl,
      date_of_birth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      bio: user.bio,
      email_verified_at: user.emailVerifiedAt,
      account_status: user.accountStatus,
      roles,
      permissions,
      addresses: user.addresses,
      notification_preferences: user.notificationPref,
      created_at: user.createdAt
    }
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const conflictUser = await this.prisma.user.findFirst({
        where: {
          username: dto.username.trim(),
          id: { not: userId }
        }
      })
      if (conflictUser) {
        throw new ConflictException({
          code: 'DUPLICATE_USERNAME',
          message: 'Username này đã có người sử dụng'
        })
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.full_name !== undefined ? { fullName: dto.full_name.trim() } : {}),
        ...(dto.username !== undefined ? { username: dto.username.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.date_of_birth !== undefined
          ? { dateOfBirth: dto.date_of_birth ? new Date(dto.date_of_birth) : null }
          : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio.trim() } : {}),
        ...(dto.avatar_url !== undefined ? { avatarUrl: dto.avatar_url } : {})
      }
    })

    return this.getMe(userId)
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' })
    }

    const { isValid } = await this.passwordService.verifyPassword(
      dto.current_password,
      user.passwordHash
    )
    if (!isValid) {
      throw new UnauthorizedException({
        code: 'CURRENT_PASSWORD_MISMATCH',
        message: 'Mật khẩu hiện tại không chính xác'
      })
    }

    const newHash = await this.passwordService.hashPassword(dto.new_password)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true }
      })
    ])

    return { changed: true }
  }

  async listAddresses(userId: string) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    })
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const existingCount = await this.prisma.userAddress.count({ where: { userId } })
    if (existingCount >= MAX_SAVED_ADDRESSES) {
      throw new BadRequestException({
        code: 'ADDRESS_LIMIT_REACHED',
        message: `Mỗi tài khoản chỉ được lưu tối đa ${MAX_SAVED_ADDRESSES} địa chỉ nhận hàng`
      })
    }

    const shouldBeDefault = existingCount === 0 ? true : Boolean(dto.is_default)

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false }
        })
      }

      return tx.userAddress.create({
        data: {
          userId,
          label: dto.label?.trim() || 'Nhà riêng',
          recipientName: dto.recipient_name.trim(),
          phone: dto.phone.trim(),
          streetLine1: dto.street_line1.trim(),
          streetLine2: dto.street_line2?.trim() || null,
          ward: dto.ward?.trim() || null,
          district: dto.district.trim(),
          city: dto.city.trim(),
          postalCode: dto.postal_code?.trim() || null,
          isDefault: shouldBeDefault
        }
      })
    })
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId }
    })
    if (!existing) {
      throw new NotFoundException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'Không tìm thấy địa chỉ nhận hàng'
      })
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default === true) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false }
        })
      }

      return tx.userAddress.update({
        where: { id: addressId },
        data: {
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.recipient_name !== undefined
            ? { recipientName: dto.recipient_name.trim() }
            : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
          ...(dto.street_line1 !== undefined ? { streetLine1: dto.street_line1.trim() } : {}),
          ...(dto.street_line2 !== undefined
            ? { streetLine2: dto.street_line2?.trim() || null }
            : {}),
          ...(dto.ward !== undefined ? { ward: dto.ward?.trim() || null } : {}),
          ...(dto.district !== undefined ? { district: dto.district.trim() } : {}),
          ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
          ...(dto.postal_code !== undefined
            ? { postalCode: dto.postal_code?.trim() || null }
            : {}),
          ...(dto.is_default !== undefined ? { isDefault: dto.is_default } : {})
        }
      })
    })
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId }
    })
    if (!existing) {
      throw new NotFoundException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'Không tìm thấy địa chỉ nhận hàng'
      })
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userAddress.delete({ where: { id: addressId } })

      if (existing.isDefault) {
        const nextAddress = await tx.userAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        })
        if (nextAddress) {
          await tx.userAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true }
          })
        }
      }
    })

    return { deleted: true }
  }
}

