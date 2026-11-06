import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DEFAULT_CURRENCY: z.enum(['VND', 'USD']).default('VND'),

  // PostgreSQL
  POSTGRES_URL: z.string().min(1, 'POSTGRES_URL is required'),
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.coerce.number().int().default(5432),
  PG_USER: z.string().default('postgres'),
  PG_PASSWORD: z.string().optional(),
  PG_DATABASE: z.string().default('shopping_cart_be'),

  // JWT & Auth Secrets
  JWT_SECRET_ACCESS_TOKEN: z.string().min(6).default('access_secret_fallback_dev_key'),
  JWT_SECRET_REFRESH_TOKEN: z.string().min(6).default('refresh_secret_fallback_dev_key'),
  JWT_SECRET_EMAIL_VERIFY_TOKEN: z.string().min(6).default('email_verify_fallback_dev_key'),
  JWT_SECRET_FORGOT_PASSWORD_TOKEN: z.string().min(6).default('forgot_password_fallback_dev_key'),
  ACCESS_TOKEN_EXPIRE_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRE_IN: z.string().default('7d'),
  PASSWORD_SECRET: z.string().optional(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('shopping_cart_be'),

  // Google OAuth 2.0
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default('http://localhost:3000/api/v1/auth/google/callback'),

  // AI Assistant (Gemini)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_DAILY_MAX_COST_USD: z.coerce.number().positive().default(10.0),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  // VNPay Sandbox
  VNPAY_TMN_CODE: z.string().default('DEMO_VNPAY_TMN'),
  VNPAY_HASH_SECRET: z.string().default('DEMO_VNPAY_HASH_SECRET_KEY_2026'),
  VNPAY_URL: z.string().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNPAY_RETURN_URL: z.string().default('http://localhost:5173/checkout/payment-return')
})

export type AppEnvConfig = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): AppEnvConfig {
  const parsed = envSchema.safeParse(config)
  if (!parsed.success) {
    const formattedErrors = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`[Environment Validation Failed] ${formattedErrors}`)
  }
  return parsed.data
}
