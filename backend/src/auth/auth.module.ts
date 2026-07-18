import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { PlansModule } from '../plans/plans.module';
import { EmailModule } from '../email/email.module';
import { SettingsModule } from '../settings/settings.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ModulesModule } from '../modules/modules.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    UsersModule,
    CompaniesModule,
    PlansModule,
    EmailModule,
    SettingsModule,
    CouponsModule,
    ModulesModule,
    BillingModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule { }
