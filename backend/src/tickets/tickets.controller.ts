import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    create(@Request() req, @Body() createTicketDto: CreateTicketDto) {
        return this.ticketsService.createTicket(req.user, createTicketDto);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    findAll(@Request() req) {
        return this.ticketsService.findAll(req.user);
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    findOne(@Request() req, @Param('id') id: string) {
        return this.ticketsService.findOne(id, req.user);
    }

    @Post(':id/reply')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    async reply(@Request() req, @Param('id') id: string, @Body() replyTicketDto: ReplyTicketDto) {
        try {
            return await this.ticketsService.reply(id, req.user, replyTicketDto);
        } catch (error) {
            console.error('DEBUG Ticket Reply API Crash Error: ', error);
            throw error;
        }
    }

    @Patch(':id/status')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    updateStatus(@Request() req, @Param('id') id: string, @Body() updateStatusDto: UpdateTicketStatusDto) {
        return this.ticketsService.updateStatus(id, updateStatusDto, req.user);
    }
}
