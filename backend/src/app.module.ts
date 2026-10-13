import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { ClientsModule } from './clients/clients.module';
import { LeadsModule } from './leads/leads.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlansModule } from './plans/plans.module';
import { SettingsModule } from './settings/settings.module';
import { MarketingModule } from './marketing/marketing.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { TicketsModule } from './tickets/tickets.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { CallingModule } from './calling/calling.module';
import { CouponsModule } from './coupons/coupons.module';
import { ModulesModule } from './modules/modules.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: (configService.get<string>('DB_TYPE') || 'postgres') as any,
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('DB_SYNCHRONIZE') !== 'false', // Auto-create tables (disable in production)
        logging: true,
        extra: {
          max: 40, // max connection pool size
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CompaniesModule,
    ClientsModule,
    LeadsModule,
    WebhooksModule,
    DashboardModule,
    BillingModule,
    NotificationsModule,
    PlansModule,
    SettingsModule,
    MarketingModule,
    IntegrationsModule,
    WhatsAppModule,
    TicketsModule,
    AnnouncementsModule,
    CallingModule,
    CouponsModule,
    ModulesModule,
    CompanySettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
