import { Global, Module } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PasswordService } from './password.service'

@Global()
@Module({
  controllers: [AuthController],
  providers: [PasswordService, AuthService, JwtAuthGuard, PermissionsGuard],
  exports: [PasswordService, AuthService, JwtAuthGuard, PermissionsGuard]
})
export class AuthModule {}
