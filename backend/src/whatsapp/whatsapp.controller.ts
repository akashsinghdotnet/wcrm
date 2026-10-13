import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
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
    async getConfig(@Query('companyId') companyId: string, @Request() req) {
        const targetCompanyId = companyId || req.user.companyId;
        const config = await this.whatsappService.getConfig(targetCompanyId);
        if (!config) return null;
        // Never expose sensitive Meta App Secret or system secrets to frontend
        const { metaAppSecret, ...safeConfig } = config as any;
        return safeConfig;
    }

    @Get('check-config')
    @UseGuards(JwtAuthGuard)
    async checkConfig(@Request() req) {
        const config = await this.whatsappService.getConfig(req.user.companyId);
        return {
            configured: !!(config && config.phoneNumberId && config.accessToken),
        };
    }

    @Post('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    saveConfig(@Body() dto: SaveWhatsAppConfigDto) {
        return this.whatsappService.saveConfig(dto);
    }

    @Post('embedded-signup')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    handleEmbeddedSignup(@Body() body: any, @Request() req) {
        if (process.env.DEPLOYMENT_MODE === 'self_hosted') {
            throw new BadRequestException('1-Click Meta Embedded Signup is only supported in Cloud Edition.');
        }
        return this.whatsappService.handleEmbeddedSignup(req.user.companyId, body);
    }

    @Post('meta-app-credentials')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    saveMetaAppCredentials(@Body() body: any, @Request() req) {
        return this.whatsappService.saveMetaAppCredentials(req.user.companyId, body);
    }

    @Get('available-numbers')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    fetchAvailablePhoneNumbers(@Query('token') token: string, @Query('wabaId') wabaId: string, @Request() req) {
        return this.whatsappService.fetchAvailablePhoneNumbers(req.user.companyId, token, wabaId);
    }

    @Post('select-number')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    selectPhoneNumber(@Body() body: { phoneNumberId: string; wabaId?: string; accessToken?: string }, @Request() req) {
        return this.whatsappService.selectPhoneNumber(req.user.companyId, body);
    }

    @Post('disconnect')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    disconnect(@Request() req) {
        return this.whatsappService.disconnectWhatsApp(req.user.companyId);
    }

    @Post('send')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    sendMessage(@Body() dto: SendMessageDto, @Request() req) {
        return this.whatsappService.sendMessage(
            req.user.companyId,
            dto.leadId || null,
            dto.to,
            dto.message,
            dto.type,
            dto.mediaId,
            req.user.userId,
            dto.replyToMessageId,
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

    @Get('link-preview')
    @UseGuards(JwtAuthGuard)
    async getLinkPreview(@Query('url') url: string) {
        if (!url) throw new BadRequestException('URL is required');
        return this.whatsappService.getLinkPreview(url);
    }

    @Get('unread-count')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getGlobalUnreadCount(@Request() req) {
        return this.whatsappService.getGlobalUnreadCount(req.user.companyId, req.user);
    }

    @Get('conversations')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getConversations(@Request() req) {
        return this.whatsappService.getConversations(req.user.companyId, req.user);
    }

    // Mark all messages for a lead as read
    @Patch('messages/:leadId/read')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    markAsRead(@Param('leadId') leadId: string, @Request() req) {
        return this.whatsappService.markMessagesAsRead(req.user.companyId, leadId, req.user);
    }

    @Delete('messages/:leadId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    deleteChatHistory(@Param('leadId') leadId: string, @Request() req) {
        return this.whatsappService.deleteChatHistory(req.user.companyId, leadId);
    }

    // This must come AFTER all specific GET routes to avoid catching them
    @Get('messages/:leadId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getMessages(@Param('leadId') leadId: string, @Request() req) {
        return this.whatsappService.getMessages(req.user.companyId, leadId, req.user);
    }

    @Get('media/:mediaId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async getMedia(@Param('mediaId') mediaId: string, @Request() req, @Res() res: any) {
        const { buffer, mimeType } = await this.whatsappService.downloadMedia(req.user.companyId, mediaId);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(buffer);
    }

    // Fetch all templates from Meta
    @Get('templates')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    fetchTemplates(@Request() req) {
        return this.whatsappService.fetchTemplates(req.user.companyId);
    }

    // Submit new template directly to Meta Graph API for approval
    @Post('templates/create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    createTemplate(@Body() body: any, @Request() req) {
        return this.whatsappService.createAndSubmitTemplate(req.user.companyId, body);
    }

    // Delete template from Meta and local DB
    @Delete('templates/:name')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteTemplate(@Param('name') name: string, @Request() req) {
        return this.whatsappService.deleteTemplate(req.user.companyId, name);
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

    @Get('webhook')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ) {
        const validTokens = [process.env.META_WEBHOOK_VERIFY_TOKEN, 'wcrm'].filter(Boolean);
        if (mode === 'subscribe' && validTokens.includes(token)) {
            // Return the challenge exactly as-is (Meta expects the raw string echoed back)
            return challenge;
        }
        return 'OK';
    }

    // Debug endpoint to check WhatsApp configuration
    @Get('debug/:companyId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async debugConfig(@Param('companyId') companyId: string) {
        return this.whatsappService.debugConfiguration(companyId);
    }
}
