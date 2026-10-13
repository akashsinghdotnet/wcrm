import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Company } from '../companies/company.entity';
import { EmailModule } from '../email/email.module';

import { UsersController } from './users.controller';

import { UserLoginLog } from './user-login-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company, UserLoginLog]), EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule { }
