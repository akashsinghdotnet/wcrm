import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('hotels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HotelsController {
    constructor(private readonly hotelsService: HotelsService) {}

    // ─── Stats ──────────────────────────────────────────────────────────────────
    @Get('stats')
    getStats(@Request() req) {
        return this.hotelsService.getStats(req.user.companyId);
    }

    // ─── Hotels ──────────────────────────────────────────────────────────────────
    @Get()
    getHotels(@Request() req) {
        return this.hotelsService.getHotels(req.user.companyId);
    }

    @Post()
    createHotel(@Request() req, @Body() body: any) {
        return this.hotelsService.createHotel(req.user.companyId, body);
    }

    @Patch(':id')
    updateHotel(@Request() req, @Param('id') id: string, @Body() body: any) {
        return this.hotelsService.updateHotel(req.user.companyId, id, body);
    }

    @Delete(':id')
    deleteHotel(@Request() req, @Param('id') id: string) {
        return this.hotelsService.deleteHotel(req.user.companyId, id);
    }

    // ─── Room Types ─────────────────────────────────────────────────────────────
    @Get(':hotelId/room-types')
    getRoomTypes(@Request() req, @Param('hotelId') hotelId: string) {
        return this.hotelsService.getRoomTypes(req.user.companyId, hotelId);
    }

    @Post(':hotelId/room-types')
    createRoomType(@Request() req, @Param('hotelId') hotelId: string, @Body() body: any) {
        return this.hotelsService.createRoomType(req.user.companyId, hotelId, body);
    }

    @Patch('room-types/:id')
    updateRoomType(@Request() req, @Param('id') id: string, @Body() body: any) {
        return this.hotelsService.updateRoomType(req.user.companyId, id, body);
    }

    @Delete('room-types/:id')
    deleteRoomType(@Request() req, @Param('id') id: string) {
        return this.hotelsService.deleteRoomType(req.user.companyId, id);
    }

    // ─── Bookings ───────────────────────────────────────────────────────────────
    @Get('bookings')
    getBookings(@Request() req, @Query() query: any) {
        return this.hotelsService.getBookings(req.user.companyId, query);
    }

    @Get('bookings/:id')
    getBookingById(@Request() req, @Param('id') id: string) {
        return this.hotelsService.getBookingById(req.user.companyId, id);
    }

    @Post('bookings')
    createBooking(@Request() req, @Body() body: any) {
        return this.hotelsService.createBooking(req.user.companyId, body);
    }

    @Patch('bookings/:id/status')
    updateBookingStatus(@Request() req, @Param('id') id: string, @Body('status') status: string) {
        return this.hotelsService.updateBookingStatus(req.user.companyId, id, status);
    }

    @Delete('bookings/:id')
    deleteBooking(@Request() req, @Param('id') id: string) {
        return this.hotelsService.deleteBooking(req.user.companyId, id);
    }
}
