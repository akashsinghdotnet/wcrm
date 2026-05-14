import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { BookingStatus } from './entities/event-booking.entity';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    // ── Events ────────────────────────────────────────────────────────────────

    @Get()
    findAll(@Request() req) {
        return this.eventsService.findAllEvents(req.user.companyId);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    create(@Request() req, @Body() body: any) {
        return this.eventsService.createEvent(req.user.companyId, body);
    }

    @Get('bookings/all')
    findAllBookings(@Request() req) {
        return this.eventsService.findAllCompanyBookings(req.user.companyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.eventsService.findEventById(id, req.user.companyId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    update(@Param('id') id: string, @Request() req, @Body() body: any) {
        return this.eventsService.updateEvent(id, req.user.companyId, body);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string, @Request() req) {
        return this.eventsService.deleteEvent(id, req.user.companyId);
    }

    // ── Ticket Types ──────────────────────────────────────────────────────────

    @Get(':id/ticket-types')
    getTicketTypes(@Param('id') id: string) {
        return this.eventsService.findTicketTypes(id);
    }

    @Post(':id/ticket-types')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    createTicketType(@Param('id') eventId: string, @Body() body: any) {
        return this.eventsService.createTicketType(eventId, body);
    }

    @Patch('ticket-types/:ttId')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    updateTicketType(@Param('ttId') id: string, @Body() body: any) {
        return this.eventsService.updateTicketType(id, body);
    }

    @Delete('ticket-types/:ttId')
    @Roles(UserRole.ADMIN)
    deleteTicketType(@Param('ttId') id: string) {
        return this.eventsService.deleteTicketType(id);
    }

    // ── Bookings ──────────────────────────────────────────────────────────────

    @Get(':id/bookings')
    getBookings(@Param('id') eventId: string) {
        return this.eventsService.findBookingsByEvent(eventId);
    }

    @Get(':id/stats')
    getStats(@Param('id') eventId: string) {
        return this.eventsService.getEventStats(eventId);
    }

    @Patch('bookings/:bookingId/status')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    updateBookingStatus(
        @Param('bookingId') bookingId: string,
        @Body() body: { status: BookingStatus },
        @Request() req,
    ) {
        return this.eventsService.updateBookingStatus(bookingId, req.user.companyId, body.status);
    }
}
