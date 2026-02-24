import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get('public')
    findAllPublic() {
        return this.settingsService.findAllPublic();
    }

    @Patch(':key')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
        return this.settingsService.update(key, dto);
    }
}
