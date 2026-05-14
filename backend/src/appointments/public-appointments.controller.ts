import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('public/booking')
export class PublicAppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Get(':bookingSlug/:slug')
    getPublicMeetingType(
        @Param('bookingSlug') bookingSlug: string,
        @Param('slug') slug: string
    ) {
        return this.appointmentsService.getPublicCompanyAndMeetingType(bookingSlug, slug);
    }

    @Get(':bookingSlug/:slug/availability')
    getAvailability(
        @Param('bookingSlug') bookingSlug: string,
        @Param('slug') slug: string,
        @Query('date') date: string
    ) {
        if (!date) throw new BadRequestException('Date is required');
        return this.appointmentsService.getAvailability(bookingSlug, slug, date);
    }

    @Post(':bookingSlug/:slug/book')
    bookAppointment(
        @Param('bookingSlug') bookingSlug: string,
        @Param('slug') slug: string,
        @Body() body
    ) {
        if (!body.guestName || !body.guestEmail || !body.date || !body.startTime) {
            throw new BadRequestException('Missing required fields');
        }
        return this.appointmentsService.bookAppointment(bookingSlug, slug, body);
    }
}
