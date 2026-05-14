import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingType } from './entities/meeting-type.entity';
import { AppointmentSetting } from './entities/appointment-setting.entity';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PublicAppointmentsController } from './public-appointments.controller';
import { WidgetController } from './widget.controller';
import { EmailModule } from '../email/email.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MeetingType, AppointmentSetting, Appointment]),
        EmailModule,
        CompaniesModule,
    ],
    providers: [AppointmentsService],
    controllers: [AppointmentsController, PublicAppointmentsController, WidgetController],
    exports: [AppointmentsService],
})
export class AppointmentsModule { }
