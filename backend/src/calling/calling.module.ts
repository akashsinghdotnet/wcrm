import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallingConfig } from './calling-config.entity';
import { CallLog } from './call-log.entity';
import { Activity } from '../leads/activity.entity';
import { CallingService } from './calling.service';
import { CallingController } from './calling.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([CallingConfig, CallLog, Activity]),
    ],
    controllers: [CallingController],
    providers: [CallingService],
    exports: [CallingService],
})
export class CallingModule { }
