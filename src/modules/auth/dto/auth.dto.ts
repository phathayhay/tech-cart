import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from 'class-validator'

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/

export class RegisterDto {
  @ApiProperty({ example: 'khachhang@techcart.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @Matches(STRONG_PASSWORD_REGEX, {
    message:
      'Mật khẩu phải từ 8–64 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt'
  })
  password: string

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @MaxLength(150)
  full_name: string

  @ApiPropertyOptional({ example: '0909123456' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string
}

export class LoginDto {
  @ApiProperty({ example: 'customer@techcart.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh_token: string
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refresh_token?: string

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  all_devices?: boolean
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'customer@techcart.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @Matches(STRONG_PASSWORD_REGEX, {
    message:
      'Mật khẩu mới phải từ 8–64 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt'
  })
  new_password: string
}
