import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request, Response } from 'express'
import { CurrentUser, Public } from '../../common/decorators/auth.decorators'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AuthService } from './auth.service'
import {
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto
} from './dto/auth.dto'
import { GoogleOAuthService } from './google-oauth.service'

@ApiTags('M01: Authentication & Authorization')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'FR-AUTH-001: Register new customer account with bcrypt password hashing' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const data = await this.authService.register(dto, req.ip, req.headers['user-agent'])
    return {
      message: 'Đăng ký tài khoản thành công',
      data
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-AUTH-002: Authenticate user, auto-upgrade legacy hash & issue JWT pair' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const data = await this.authService.login(dto, req.ip, req.headers['user-agent'])
    return {
      message: 'Đăng nhập thành công',
      data
    }
  }

  @Public()
  @Get('google/url')
  @ApiOperation({ summary: 'FR-AUTH-008: Get Google OAuth 2.0 Consent Screen URL & config status' })
  getGoogleUrl(@Query('redirect_uri') redirectUri?: string) {
    const data = this.authService.getGoogleAuthUrl(redirectUri)
    return {
      message: 'Lấy đường dẫn đăng nhập Google thành công',
      data
    }
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FR-AUTH-008: Authenticate or link account using Google ID Token or Authorization Code'
  })
  async googleLogin(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    const data = await this.authService.loginWithGoogle(dto, req.ip, req.headers['user-agent'])
    return {
      message: data.is_new_user
        ? 'Đăng ký và đăng nhập bằng Google thành công'
        : 'Đăng nhập bằng Google thành công',
      data
    }
  }

  @Public()
  @Post('google/dev-simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'FR-AUTH-008 (Dev/Sandbox): Generate a signed Google OAuth simulation session for local testing'
  })
  async googleDevSimulate(
    @Body()
    body: {
      email?: string
      name?: string
      full_name?: string
      sub?: string
      picture?: string
      avatar_url?: string
    },
    @Req() req: Request
  ) {
    const targetEmail = (body.email || 'google.user@techcart.com').trim().toLowerCase()
    const targetSub =
      body.sub || `google_sub_${Buffer.from(targetEmail).toString('hex').slice(0, 32)}`
    const simToken = this.googleOAuthService.createDevSimulationToken({
      sub: targetSub,
      email: targetEmail,
      name: body.full_name || body.name || 'Nguyễn Minh (Google Account)',
      picture:
        body.avatar_url ||
        body.picture ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'
    })
    const data = await this.authService.loginWithGoogle(
      { id_token: simToken },
      req.ip,
      req.headers['user-agent']
    )
    return {
      message: 'Đăng nhập bằng tài khoản Google thành công',
      data
    }
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'FR-AUTH-008: Google OAuth 2.0 Redirect Callback handler' })
  async googleCallback(
    @Query('code') code: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const data = await this.authService.loginWithGoogle(
      { code },
      req.ip,
      req.headers['user-agent']
    )
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const params = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      google_login: 'success'
    })
    return res.redirect(`${frontendUrl}/?${params.toString()}`)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-AUTH-003: Rotate Refresh Token & detect token family reuse compromise' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const data = await this.authService.refreshTokens(dto, req.ip, req.headers['user-agent'])
    return {
      message: 'Làm mới phiên đăng nhập thành công',
      data
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-AUTH-004: Revoke current refresh token or all active sessions' })
  async logout(@CurrentUser('id') userId: string, @Body() dto: LogoutDto) {
    const data = await this.authService.logout(userId, dto)
    return {
      message: 'Đăng xuất thành công',
      data
    }
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-AUTH-005: Verify email address token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const data = await this.authService.verifyEmail(dto)
    return {
      message: 'Xác thực email thành công',
      data
    }
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-AUTH-006: Request password reset token' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto)
    return {
      message: data.message,
      data
    }
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR-AUTH-006: Reset password with token and revoke active sessions' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.authService.resetPassword(dto)
    return {
      message: 'Đặt lại mật khẩu thành công',
      data
    }
  }
}

