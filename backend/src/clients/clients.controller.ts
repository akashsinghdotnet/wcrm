import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    create(@Body() createClientDto: CreateClientDto) {
        return this.clientsService.create(createClientDto);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    findAll(
        @Query('companyId') companyId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.clientsService.findAll(companyId, page, limit);
    }

    @Patch('bulk')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    bulkUpdate(@Body() body: { ids: string[]; updates: UpdateClientDto }) {
        return this.clientsService.bulkUpdate(body.ids, body.updates);
    }

    @Delete('bulk')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    bulkDelete(@Body() body: { ids: string[] }) {
        return this.clientsService.bulkDelete(body.ids);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.clientsService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
        return this.clientsService.update(id, updateClientDto);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    remove(@Param('id') id: string) {
        return this.clientsService.remove(id);
    }
}
