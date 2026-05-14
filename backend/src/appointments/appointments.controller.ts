import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Get('settings')
    getSettings(@Request() req) {
        return this.appointmentsService.getSettings(req.user.companyId);
    }

    @Put('settings')
    updateSettings(@Request() req, @Body() body) {
        return this.appointmentsService.updateSettings(req.user.companyId, body);
    }

    @Get('meeting-types')
    getMeetingTypes(@Request() req) {
        return this.appointmentsService.getMeetingTypes(req.user.companyId);
    }

    @Post('meeting-types')
    createMeetingType(@Request() req, @Body() body) {
        return this.appointmentsService.createMeetingType(req.user.companyId, body);
    }

    @Put('meeting-types/:id')
    updateMeetingType(@Request() req, @Param('id') id: string, @Body() body) {
        return this.appointmentsService.updateMeetingType(req.user.companyId, id, body);
    }

    @Delete('meeting-types/:id')
    deleteMeetingType(@Request() req, @Param('id') id: string) {
        return this.appointmentsService.deleteMeetingType(req.user.companyId, id);
    }

    @Get('detail/:id')
    getAppointmentDetail(@Request() req, @Param('id') id: string) {
        return this.appointmentsService.getAppointmentById(req.user.companyId, id);
    }

    @Put(':id/status')
    updateStatus(@Request() req, @Param('id') id: string, @Body('status') status: string) {
        return this.appointmentsService.updateStatus(req.user.companyId, id, status);
    }

    @Put(':id/reschedule')
    reschedule(@Request() req, @Param('id') id: string, @Body() body: { date: string, startTime: string }) {
        return this.appointmentsService.reschedule(req.user.companyId, id, body.date, body.startTime);
    }

    @Delete(':id')
    deleteAppointment(@Request() req, @Param('id') id: string) {
        return this.appointmentsService.deleteAppointment(req.user.companyId, id);
    }

    @Get()
    getAppointments(@Request() req) {
        return this.appointmentsService.getAppointments(req.user.companyId);
    }
}
