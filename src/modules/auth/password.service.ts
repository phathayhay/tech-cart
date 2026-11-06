import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { AppEnvConfig } from '../../config/env.validation'

export interface PasswordVerificationResult {
  isValid: boolean
  needsRehash: boolean
}

@Injectable()
export class PasswordService {
  private readonly saltRounds: number
  private readonly legacySecret: string

  constructor(private readonly configService: ConfigService<AppEnvConfig, true>) {
    this.saltRounds = this.configService.get('BCRYPT_SALT_ROUNDS', { infer: true }) || 12
    this.legacySecret = this.configService.get('PASSWORD_SECRET', { infer: true }) || ''
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds)
  }

  /**
   * Verifies a plaintext password against either a modern bcrypt hash ($2b$/$2a$)
   * or a legacy SHA-256 hex digest. If a legacy digest matches, returns needsRehash = true
   * so AuthService transparently upgrades the stored hash to bcrypt.
   */
  async verifyPassword(
    plainPassword: string,
    storedHash: string
  ): Promise<PasswordVerificationResult> {
    if (!storedHash) {
      return { isValid: false, needsRehash: false }
    }

    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
      const isValid = await bcrypt.compare(plainPassword, storedHash)
      return { isValid, needsRehash: false }
    }

    // Legacy SHA-256 fallback (64-char hex)
    if (/^[a-f0-9]{64}$/i.test(storedHash)) {
      const legacyDigest = createHash('sha256')
        .update(plainPassword + this.legacySecret)
        .digest('hex')
      const isValid = legacyDigest.toLowerCase() === storedHash.toLowerCase()
      return { isValid, needsRehash: isValid }
    }

    return { isValid: false, needsRehash: false }
  }

  hashTokenSha256(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
  }
}
