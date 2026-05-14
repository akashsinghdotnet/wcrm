import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { HotelsService } from './hotels.service';

@Controller('public/hotels')
export class PublicHotelsController {
    constructor(private readonly hotelsService: HotelsService) {}

    @Get(':slug')
    getHotel(@Param('slug') slug: string) {
        return this.hotelsService.getPublicHotel(slug);
    }

    @Get(':slug/availability')
    checkAvailability(
        @Param('slug') slug: string,
        @Query('roomTypeId') roomTypeId: string,
        @Query('checkIn') checkIn: string,
        @Query('checkOut') checkOut: string,
    ) {
        return this.hotelsService.publicCheckAvailability(slug, roomTypeId, checkIn, checkOut);
    }

    @Post(':slug/book')
    book(@Param('slug') slug: string, @Body() body: any) {
        return this.hotelsService.publicCreateBooking(slug, { ...body, source: 'direct' });
    }
}
