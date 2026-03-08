import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WhatsAppService } from './whatsapp.service';
import { SaveWhatsAppConfigDto } from './dto/save-config.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('whatsapp')
export class WhatsAppController {
    constructor(private readonly whatsappService: WhatsAppService) { }

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
            dto.type,
            dto.mediaId,
            req.user.userId,
        );
    }

    @Post('media')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    @UseInterceptors(FileInterceptor('file'))
    async uploadMedia(@UploadedFile() file: any, @Request() req) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.whatsappService.uploadMedia(req.user.companyId, file);
    }

    @Get('unread-count')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getGlobalUnreadCount(@Request() req) {
        return this.whatsappService.getGlobalUnreadCount(req.user.companyId);
    }

    @Get('conversations')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getConversations(@Request() req) {
        return this.whatsappService.getConversations(req.user.companyId);
    }

    // Mark all messages for a lead as read
    @Patch('messages/:leadId/read')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    markAsRead(@Param('leadId') leadId: string, @Request() req) {
        return this.whatsappService.markMessagesAsRead(req.user.companyId, leadId);
    }

    // This must come AFTER all specific GET routes to avoid catching them
    @Get('messages/:leadId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getMessages(@Param('leadId') leadId: string, @Request() req) {
        return this.whatsappService.getMessages(req.user.companyId, leadId);
    }

    // Fetch approved templates from Meta
    @Get('templates')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    fetchTemplates(@Request() req) {
        return this.whatsappService.fetchTemplates(req.user.companyId);
    }

    // Save auto-reply settings
    @Patch('auto-reply')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    saveAutoReply(@Body() body: any, @Request() req) {
        return this.whatsappService.saveAutoReplySettings(req.user.companyId, body);
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
        const VERIFY_TOKEN = 'magnet-crm';
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return parseInt(challenge);
        }
        return 'OK';
    }
}
