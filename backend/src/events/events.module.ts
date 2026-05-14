import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventTicketType } from './entities/event-ticket-type.entity';
import { EventBooking } from './entities/event-booking.entity';
import { User } from '../users/user.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Event, EventTicketType, EventBooking, User]),
        CompanySettingsModule,
        EmailModule,
    ],
    providers: [EventsService],
    controllers: [EventsController, PublicEventsController],
    exports: [EventsService],
})
export class EventsModule { }
