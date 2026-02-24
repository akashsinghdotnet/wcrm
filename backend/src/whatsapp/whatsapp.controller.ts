import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { SaveWhatsAppConfigDto } from './dto/save-config.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('whatsapp')
export class WhatsAppController {
    constructor(private readonly whatsappService: WhatsAppService) {}

    @Get('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getConfig(@Query('companyId') companyId: string) {
        return this.whatsappService.getConfig(companyId);
    }

    @Post('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    saveConfig(@Body() dto: SaveWhatsAppConfigDto) {
        return this.whatsappService.saveConfig(dto);
    }

    @Post('send')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    sendMessage(@Body() dto: SendMessageDto, @Request() req) {
        return this.whatsappService.sendMessage(
            req.user.companyId,
            dto.leadId,
            dto.to,
            dto.message,
            req.user.userId,
        );
    }

    @Get('conversations')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getConversations(@Request() req) {
        return this.whatsappService.getConversations(req.user.companyId);
    }

    @Get('messages/:leadId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getMessages(@Param('leadId') leadId: string, @Request() req) {
        return this.whatsappService.getMessages(req.user.companyId, leadId);
    }

    // Public webhook endpoint for Meta to send incoming messages
    @Post('webhook')
    handleWebhook(@Body() body: any) {
        return this.whatsappService.handleIncomingWebhook(body);
    }

    // Meta webhook verification (GET request with challenge)
    @Get('webhook')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ) {
        // The verify token should match what you set in Meta Developer Portal
        // For now, accept any verification request
        if (mode === 'subscribe') {
            return parseInt(challenge);
        }
        return 'OK';
    }
}
