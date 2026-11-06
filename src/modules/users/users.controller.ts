import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/auth.decorators'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import {
  ChangePasswordDto,
  CreateAddressDto,
  UpdateAddressDto,
  UpdateProfileDto
} from './dto/users.dto'
import { UsersService } from './users.service'

@ApiTags('M02: User Management & Address Book')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'FR-USER-001: Get current authenticated user profile, roles & addresses' })
  async getMe(@CurrentUser('id') userId: string) {
    const data = await this.usersService.getMe(userId)
    return {
      message: 'Lấy thông tin tài khoản thành công',
      data
    }
  }

  @Patch('me')
  @ApiOperation({ summary: 'FR-USER-001: Update personal profile & Cloudinary avatar URL' })
  async updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    const data = await this.usersService.updateMe(userId, dto)
    return {
      message: 'Cập nhật hồ sơ thành công',
      data
    }
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-USER-003: Change password & revoke active refresh tokens' })
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    const data = await this.usersService.changePassword(userId, dto)
    return {
      message: 'Đổi mật khẩu thành công',
      data
    }
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'FR-USER-004: List saved shipping addresses' })
  async listAddresses(@CurrentUser('id') userId: string) {
    const data = await this.usersService.listAddresses(userId)
    return {
      message: 'Lấy danh sách địa chỉ thành công',
      data
    }
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'FR-USER-004: Add new shipping address with atomic default toggle' })
  async createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    const data = await this.usersService.createAddress(userId, dto)
    return {
      message: 'Thêm địa chỉ nhận hàng thành công',
      data
    }
  }

  @Patch('me/addresses/:id')
  @ApiOperation({ summary: 'FR-USER-004: Update shipping address & default status' })
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto
  ) {
    const data = await this.usersService.updateAddress(userId, addressId, dto)
    return {
      message: 'Cập nhật địa chỉ nhận hàng thành công',
      data
    }
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'FR-USER-004: Delete shipping address' })
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string
  ) {
    const data = await this.usersService.deleteAddress(userId, addressId)
    return {
      message: 'Xóa địa chỉ nhận hàng thành công',
      data
    }
  }
}
