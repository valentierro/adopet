import { Global, Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AdminGuard } from './admin.guard';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnersModule } from '../partners/partners.module';
import { EmailModule } from '../email/email.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => PartnersModule),
    EmailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'adopet-dev-secret-change-in-production',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminGuard, OptionalJwtAuthGuard],
  exports: [AuthService, JwtModule, AdminGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
