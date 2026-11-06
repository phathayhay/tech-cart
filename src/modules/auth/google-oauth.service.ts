import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'
import { AppEnvConfig } from '../../config/env.validation'
import { GoogleAuthDto } from './dto/auth.dto'

export interface VerifiedGoogleProfile {
  googleId: string
  email: string
  emailVerified: boolean
  fullName: string
  avatarUrl?: string
}

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly configService: ConfigService<AppEnvConfig, true>) {}

  isGoogleOAuthConfigured(): boolean {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID', { infer: true })
    return Boolean(clientId && !clientId.startsWith('your_google_oauth'))
  }

  getAuthorizationUrl(customRedirectUri?: string): {
    auth_url: string
    client_id: string | null
    redirect_uri: string
    configured: boolean
    dev_simulation_enabled: boolean
  } {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID', { infer: true }) || null
    const redirectUri =
      customRedirectUri ||
      this.configService.get('GOOGLE_REDIRECT_URI', { infer: true }) ||
      'http://localhost:3000/api/v1/auth/google/callback'
    const configured = this.isGoogleOAuthConfigured()

    const params = new URLSearchParams({
      client_id: clientId || 'DEMO_GOOGLE_CLIENT_ID',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account'
    })

    return {
      auth_url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      client_id: clientId,
      redirect_uri: redirectUri,
      configured,
      dev_simulation_enabled: process.env.NODE_ENV !== 'production'
    }
  }

  /**
   * Verifies either a Google ID Token (`id_token`) or an OAuth2 Authorization Code (`code`).
   * In non-production environments, also supports deterministic signed dev tokens
   * (`dev_google_jwt:<signed_jwt>`) for automated integration testing and offline development.
   */
  async verifyGoogleCredentials(dto: GoogleAuthDto): Promise<VerifiedGoogleProfile> {
    if (!dto.id_token && !dto.code) {
      throw new BadRequestException({
        code: 'MISSING_GOOGLE_CREDENTIALS',
        message: 'Cần cung cấp id_token hoặc authorization code từ Google'
      })
    }

    // 1. Non-production signed test/simulation token support
    if (
      process.env.NODE_ENV !== 'production' &&
      dto.id_token &&
      dto.id_token.startsWith('dev_google_jwt:')
    ) {
      const rawJwt = dto.id_token.slice('dev_google_jwt:'.length)
      const secret = this.configService.get('JWT_SECRET_ACCESS_TOKEN', { infer: true })
      try {
        const decoded = jwt.verify(rawJwt, secret) as {
          sub: string
          email: string
          name: string
          picture?: string
          email_verified?: boolean
        }
        return {
          googleId: decoded.sub,
          email: decoded.email.trim().toLowerCase(),
          emailVerified: decoded.email_verified !== false,
          fullName: decoded.name || decoded.email.split('@')[0],
          avatarUrl: decoded.picture
        }
      } catch {
        throw new UnauthorizedException({
          code: 'INVALID_GOOGLE_TOKEN',
          message: 'Dev Google simulation token không hợp lệ'
        })
      }
    }

    // 2. If authorization `code` is provided, exchange it for tokens at Google OAuth2 endpoint
    let idTokenToVerify = dto.id_token
    if (dto.code) {
      const clientId = this.configService.get('GOOGLE_CLIENT_ID', { infer: true })
      const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET', { infer: true })
      const redirectUri =
        dto.redirect_uri ||
        this.configService.get('GOOGLE_REDIRECT_URI', { infer: true }) ||
        'http://localhost:3000/api/v1/auth/google/callback'

      if (!clientId || !clientSecret) {
        throw new BadRequestException({
          code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
          message:
            'Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong file .env'
        })
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: dto.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      })

      const tokenData: any = await tokenRes.json()
      if (!tokenRes.ok || !tokenData.id_token) {
        throw new UnauthorizedException({
          code: 'GOOGLE_CODE_EXCHANGE_FAILED',
          message:
            tokenData?.error_description || 'Không thể xác thực mã ủy quyền với Google OAuth'
        })
      }
      idTokenToVerify = tokenData.id_token
    }

    // 3. Verify Google `id_token` via Google's official tokeninfo endpoint
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idTokenToVerify!)}`
    )
    const payload: any = await verifyRes.json()

    if (!verifyRes.ok || !payload.sub || !payload.email) {
      throw new UnauthorizedException({
        code: 'INVALID_GOOGLE_ID_TOKEN',
        message: payload?.error_description || 'Google ID Token không hợp lệ hoặc đã hết hạn'
      })
    }

    const configuredClientId = this.configService.get('GOOGLE_CLIENT_ID', { infer: true })
    if (
      configuredClientId &&
      !configuredClientId.startsWith('your_google_oauth') &&
      payload.aud !== configuredClientId
    ) {
      throw new UnauthorizedException({
        code: 'GOOGLE_AUDIENCE_MISMATCH',
        message: 'Google ID Token không thuộc về Client ID của ứng dụng này'
      })
    }

    const emailVerified =
      payload.email_verified === true || payload.email_verified === 'true'
    if (!emailVerified) {
      throw new UnauthorizedException({
        code: 'GOOGLE_EMAIL_UNVERIFIED',
        message: 'Tài khoản Google này chưa được xác thực email'
      })
    }

    return {
      googleId: String(payload.sub),
      email: String(payload.email).trim().toLowerCase(),
      emailVerified: true,
      fullName: String(payload.name || payload.email.split('@')[0]),
      avatarUrl: payload.picture ? String(payload.picture) : undefined
    }
  }

  /**
   * Helper for non-production simulation button so developers can test Google Sign-In
   * in 1 click without needing external Google Cloud credentials.
   */
  createDevSimulationToken(profile: {
    sub: string
    email: string
    name: string
    picture?: string
  }): string {
    const secret = this.configService.get('JWT_SECRET_ACCESS_TOKEN', { infer: true })
    const signed = jwt.sign({ ...profile, email_verified: true }, secret, { expiresIn: '5m' })
    return `dev_google_jwt:${signed}`
  }
}

