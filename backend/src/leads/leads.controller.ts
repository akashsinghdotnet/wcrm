import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    create(@Body() createLeadDto: CreateLeadDto) {
        return this.leadsService.create(createLeadDto);
    }

    @Get()
    findAll(@Query() filters: FilterLeadsDto, @Request() req) {
        return this.leadsService.findAll(filters, req.user);
    }

    // ---- CSV endpoints (MUST be before :id) ----

    @Get('export')
    @Roles(UserRole.ADMIN)
    async exportCsv(@Request() req, @Res() res: Response) {
        const csv = await this.leadsService.exportCsv(req.user.companyId);
        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="leads.csv"',
        });
        res.send(csv);
    }

    @Post('import')
    @Roles(UserRole.ADMIN)
    importCsv(@Body() body: { csvText: string }, @Request() req) {
        return this.leadsService.importFromCsv(body.csvText, req.user.companyId);
    }

    // ---- Bulk endpoints (MUST be before :id) ----

    @Patch('bulk')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async bulkUpdate(@Body() body: { ids: string[]; updates: UpdateLeadDto }, @Request() req) {
        return this.leadsService.bulkUpdate(body.ids, body.updates, req.user);
    }

    @Delete('bulk')
    @Roles(UserRole.ADMIN)
    async bulkDelete(@Body() body: { ids: string[] }) {
        return this.leadsService.bulkDelete(body.ids);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leadsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req) {
        return this.leadsService.update(id, updateLeadDto, req.user?.userId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.leadsService.remove(id);
    }

    // ---- Activity endpoints ----

    @Post(':id/activities')
    addActivity(
        @Param('id') leadId: string,
        @Body() dto: Omit<CreateActivityDto, 'leadId'>,
        @Request() req,
    ) {
        return this.leadsService.addActivity({
            ...dto,
            leadId,
            userId: (dto as any).userId || req.user?.userId,
        } as CreateActivityDto);
    }

    @Get(':id/activities')
    getActivities(@Param('id') leadId: string) {
        return this.leadsService.getActivities(leadId);
    }
}
