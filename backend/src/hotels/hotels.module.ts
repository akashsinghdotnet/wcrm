import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hotel } from './entities/hotel.entity';
import { RoomType } from './entities/room-type.entity';
import { HotelBooking } from './entities/hotel-booking.entity';
import { Lead } from '../leads/lead.entity';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { PublicHotelsController } from './public-hotels.controller';
import { EmailModule } from '../email/email.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Hotel, RoomType, HotelBooking, Lead]),
        EmailModule,
        CompaniesModule,
    ],
    providers: [HotelsService],
    controllers: [HotelsController, PublicHotelsController],
    exports: [HotelsService],
})
export class HotelsModule {}
