import { Controller, Get, Post, Body } from '@nestjs/common';
import { SetupService } from './setup.service';
import { InitializeSetupDto } from './dto/initialize-setup.dto';
import { Public } from '../auth/public.decorator';

@Controller('setup')
export class SetupController {
    constructor(private readonly setupService: SetupService) { }

    @Public()
    @Get('status')
    async getStatus() {
        return this.setupService.getStatus();
    }

    @Public()
    @Post('initialize')
    async initialize(@Body() dto: InitializeSetupDto) {
        return this.setupService.initialize(dto);
    }
}
