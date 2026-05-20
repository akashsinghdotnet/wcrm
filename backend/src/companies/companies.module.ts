import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company } from './company.entity';
import { Plan } from '../plans/plan.entity';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Plan]),
    forwardRef(() => EmailModule),
    forwardRef(() => UsersModule),
    BillingModule,
  ],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule { }
