
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlansController {
    constructor(private readonly plansService: PlansService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    create(@Body() createPlanDto: CreatePlanDto) {
        return this.plansService.create(createPlanDto);
    }

    @Public()
    @Get()
    // Accessible by all users — also used by checkout page for plan lookup
    findAll() {
        return this.plansService.findAll();
    }

    @Public()
    @Get('slug/:slug')
    findBySlug(@Param('slug') slug: string) {
        return this.plansService.findBySlug(slug);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.plansService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    update(@Param('id') id: string, @Body() updatePlanDto: CreatePlanDto) {
        return this.plansService.update(id, updatePlanDto);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    remove(@Param('id') id: string) {
        return this.plansService.remove(id);
    }
}
