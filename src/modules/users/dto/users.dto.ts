import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from 'class-validator'

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Phạm Minh Phát' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  full_name?: string

  @ApiPropertyOptional({ example: 'minhphat_pro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string

  @ApiPropertyOptional({ example: '0909123456' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @ApiPropertyOptional({ example: '2000-01-15' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string

  @ApiPropertyOptional({ example: 'Yêu thích bàn phím cơ custom và thiết bị âm thanh Hi-Res' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/dnpim8h29/image/upload/v1/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar_url?: string
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  current_password: string

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @Matches(STRONG_PASSWORD_REGEX, {
    message:
      'Mật khẩu mới phải từ 8–64 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt'
  })
  new_password: string
}

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Nhà riêng', default: 'Nhà riêng' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string

  @ApiProperty({ example: 'Phạm Minh Phát' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  recipient_name: string

  @ApiProperty({ example: '0909123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string

  @ApiProperty({ example: '123 Nguyễn Huệ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street_line1: string

  @ApiPropertyOptional({ example: 'Tòa nhà Bitexco, Tầng 15' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street_line2?: string

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ward?: string

  @ApiProperty({ example: 'Quận 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string

  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string

  @ApiPropertyOptional({ example: '700000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean
}

export class UpdateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  recipient_name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street_line1?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street_line2?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ward?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_default?: boolean
}
