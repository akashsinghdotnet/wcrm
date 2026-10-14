import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    findAll(@Query('role') role: UserRole, @Request() req) {
        return this.usersService.findAll(req.user.companyId, role);
    }

    @Patch('me/password')
    changePassword(@Request() req, @Body() body: { oldPassword: string; newPassword: string }) {
        return this.usersService.changePassword(req.user.userId, body.oldPassword, body.newPassword);
    }

    @Post('me/email/request')
    requestEmailChange(@Request() req, @Body() body: { newEmail: string }) {
        return this.usersService.requestEmailChange(req.user.userId, body.newEmail);
    }

    @Post('me/email/verify')
    verifyEmailChange(@Request() req, @Body() body: { otp: string }) {
        return this.usersService.verifyEmailChange(req.user.userId, body.otp);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Patch(':id/deactivate')
    @Roles(UserRole.ADMIN)
    deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(id);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    remove(@Param('id') id: string, @Request() req) {
        return this.usersService.remove(id, req.user);
    }
}
