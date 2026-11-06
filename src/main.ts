import 'reflect-metadata'
import { ValidationPipe, Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import path from 'path'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { RequestIdAndEnvelopeInterceptor } from './common/interceptors/request-id.interceptor'
import databaseServices from './services/database.services'
import { initFolder } from './utils/file'
import usersRoutes from './routes/users.routes'
import mediasRoutes from './routes/medias.routes'
import productsRoutes from './routes/products.routes'
import cartsRoutes from './routes/carts.routes'
import ordersRoutes from './routes/orders.routes'
import staticRoutes from './routes/static.routes'
import { defaultErrorHandler } from './middlewares/error.middlewares'

export async function createNestApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true
  })

  // Security headers (with CSP configured to allow Cloudinary images and Google Fonts)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:5173']
        }
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  )

  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Session-Id', 'Idempotency-Key', 'X-Request-Id']
  })

  // Global prefix for v1 REST API
  const apiPrefix = process.env.API_PREFIX || '/api/v1'
  app.setGlobalPrefix(apiPrefix)

  // Global DTO validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  )

  // Centralized exception filter and request ID + response envelope interceptor
  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalInterceptors(new RequestIdAndEnvelopeInterceptor())

  // OpenAPI / Swagger Documentation at /api/v1/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TechCart Pro — AI-Powered E-Commerce API')
    .setDescription(
      'Production-oriented E-Commerce Platform API (VND Currency, VNPay Sandbox + COD, 360° Product Wheel Showcase & Grounded Gemini AI Assistant)'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Guest-Session-Id', in: 'header' }, 'GuestSessionId')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup(`${apiPrefix.replace(/^\//, '')}/docs`, app, document)

  // Preserve static reference UI (`public/`) and legacy routes during strangler migration
  const expressInstance = app.getHttpAdapter().getInstance()
  expressInstance.use('/users', usersRoutes)
  expressInstance.use('/medias', mediasRoutes)
  expressInstance.use('/products', productsRoutes)
  expressInstance.use('/cart', cartsRoutes)
  expressInstance.use('/orders', ordersRoutes)
  expressInstance.use('/static', staticRoutes)
  app.useStaticAssets(path.resolve('public'))
  expressInstance.use(defaultErrorHandler)

  return app
}

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  initFolder()
  await databaseServices.connect()

  const app = await createNestApp()
  const port = Number(process.env.PORT || 3000)
  await app.listen(port)
  logger.log(`TechCart Pro Server running at http://localhost:${port}`)
  logger.log(`REST API v1 available at http://localhost:${port}/api/v1/health`)
  logger.log(`Swagger OpenAPI Docs at http://localhost:${port}/api/v1/docs`)
}

if (require.main === module) {
  bootstrap()
}

