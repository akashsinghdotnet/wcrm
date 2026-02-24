import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { Lead } from './lead.entity';
import { Activity } from './activity.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Lead, Activity]),
        UsersModule, // For round-robin assignment via UsersService
    ],
    controllers: [LeadsController],
    providers: [LeadsService],
    exports: [LeadsService],
})
export class LeadsModule { }
