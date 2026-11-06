import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Pool } from 'pg'
import { AppEnvConfig } from '../../config/env.validation'

@ApiTags('Health & Observability')
@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService<AppEnvConfig, true>) {}

  @Get()
  @ApiOperation({ summary: 'System readiness probe checking PostgreSQL and Cloudinary configuration' })
  async checkHealth() {
    const startMs = Date.now()
    let postgresStatus: 'UP' | 'DOWN' = 'DOWN'
    let postgresLatencyMs = 0

    const postgresUrl = this.configService.get('POSTGRES_URL', { infer: true })
    if (postgresUrl) {
      const pool = new Pool({
        connectionString: postgresUrl,
        connectionTimeoutMillis: 2500
      })
      try {
        const dbStart = Date.now()
        await pool.query('SELECT 1')
        postgresLatencyMs = Date.now() - dbStart
        postgresStatus = 'UP'
      } catch {
        postgresStatus = 'DOWN'
      } finally {
        await pool.end().catch(() => undefined)
      }
    }

    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME', { infer: true })
    const apiKey = this.configService.get('CLOUDINARY_API_KEY', { infer: true })
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET', { infer: true })
    const cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret)

    return {
      message: 'System health check completed',
      data: {
        status: postgresStatus === 'UP' ? 'HEALTHY' : 'DEGRADED',
        service: 'TechCart Pro API (NestJS Modular Monolith)',
        currency_default: this.configService.get('DEFAULT_CURRENCY', { infer: true }),
        payment_providers: ['VNPAY_SANDBOX', 'COD'],
        uptime_seconds: Math.round(process.uptime()),
        checks: {
          database: {
            status: postgresStatus,
            latency_ms: postgresLatencyMs
          },
          cloudinary: {
            configured: cloudinaryConfigured,
            cloud_name: cloudName || null
          }
        },
        response_time_ms: Date.now() - startMs,
        timestamp: new Date().toISOString()
      }
    }
  }
}
