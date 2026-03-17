import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppCRMService } from './whatsapp-crm.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ImportContactsDto } from './dto/import-contacts.dto';
import { CreateListDto } from './dto/create-list.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';

@Controller('api/whatsapp-crm')
@UseGuards(JwtAuthGuard)
export class WhatsAppCRMController {
    constructor(private readonly crmService: WhatsAppCRMService) {}

    // ==================== CONTACTS ====================

    @Post('contacts')
    async createContact(@Request() req, @Body() dto: CreateContactDto) {
        return this.crmService.createContact(req.user.companyId, dto);
    }

    @Post('contacts/import')
    async importContacts(@Request() req, @Body() dto: ImportContactsDto) {
        return this.crmService.importContacts(req.user.companyId, dto);
    }

    @Get('contacts')
    async getContacts(
        @Request() req,
        @Query('listId') listId?: string,
        @Query('tagId') tagId?: string,
        @Query('optedIn') optedIn?: string,
        @Query('search') search?: string,
    ) {
        return this.crmService.getContacts(req.user.companyId, {
            listId,
            tagId,
            optedIn: optedIn === 'true' ? true : optedIn === 'false' ? false : undefined,
            search,
        });
    }

    @Put('contacts/:id/opt-in')
    async updateOptIn(
        @Param('id') id: string,
        @Body() body: { optedIn: boolean; source?: string }
    ) {
        return this.crmService.updateContactOptIn(id, body.optedIn, body.source);
    }

    @Delete('contacts/:id')
    async deleteContact(@Param('id') id: string) {
        await this.crmService.deleteContact(id);
        return { message: 'Contact deleted successfully' };
    }

    // ==================== LISTS ====================

    @Post('lists')
    async createList(@Request() req, @Body() dto: CreateListDto) {
        return this.crmService.createList(req.user.companyId, dto);
    }

    @Get('lists')
    async getLists(@Request() req) {
        return this.crmService.getLists(req.user.companyId);
    }

    @Post('lists/:id/contacts')
    async addContactsToList(
        @Param('id') id: string,
        @Body() body: { contactIds: string[] }
    ) {
        await this.crmService.addContactsToList(id, body.contactIds);
        return { message: 'Contacts added to list successfully' };
    }

    @Delete('lists/:id/contacts')
    async removeContactsFromList(
        @Param('id') id: string,
        @Body() body: { contactIds: string[] }
    ) {
        await this.crmService.removeContactsFromList(id, body.contactIds);
        return { message: 'Contacts removed from list successfully' };
    }

    @Delete('lists/:id')
    async deleteList(@Param('id') id: string) {
        await this.crmService.deleteList(id);
        return { message: 'List deleted successfully' };
    }

    // ==================== TAGS ====================

    @Post('tags')
    async createTag(@Request() req, @Body() dto: CreateTagDto) {
        return this.crmService.createTag(req.user.companyId, dto);
    }

    @Get('tags')
    async getTags(@Request() req) {
        return this.crmService.getTags(req.user.companyId);
    }

    @Post('contacts/:id/tags')
    async addTagsToContact(
        @Param('id') id: string,
        @Body() body: { tagIds: string[] }
    ) {
        await this.crmService.addTagsToContact(id, body.tagIds);
        return { message: 'Tags added to contact successfully' };
    }

    @Delete('contacts/:id/tags')
    async removeTagsFromContact(
        @Param('id') id: string,
        @Body() body: { tagIds: string[] }
    ) {
        await this.crmService.removeTagsFromContact(id, body.tagIds);
        return { message: 'Tags removed from contact successfully' };
    }

    @Delete('tags/:id')
    async deleteTag(@Param('id') id: string) {
        await this.crmService.deleteTag(id);
        return { message: 'Tag deleted successfully' };
    }

    // ==================== TEMPLATES ====================

    @Post('templates')
    async createTemplate(@Request() req, @Body() dto: CreateTemplateDto) {
        return this.crmService.createTemplate(req.user.companyId, dto);
    }

    @Get('templates')
    async getTemplates(@Request() req) {
        return this.crmService.getTemplates(req.user.companyId);
    }

    @Get('templates/approved')
    async getApprovedTemplates(@Request() req) {
        return this.crmService.getApprovedTemplates(req.user.companyId);
    }

    // ==================== BROADCASTS ====================

    @Post('broadcasts')
    async createBroadcast(@Request() req, @Body() dto: CreateBroadcastDto) {
        return this.crmService.createBroadcast(req.user.companyId, req.user.userId, dto);
    }

    @Get('broadcasts')
    async getBroadcasts(@Request() req) {
        return this.crmService.getBroadcasts(req.user.companyId);
    }

    @Get('broadcasts/:id/logs')
    async getBroadcastLogs(@Param('id') id: string) {
        return this.crmService.getBroadcastLogs(id);
    }

    @Post('broadcasts/:id/send')
    async sendBroadcast(@Param('id') id: string) {
        await this.crmService.sendBroadcast(id);
        return { message: 'Broadcast sent successfully' };
    }

    // ==================== ANALYTICS ====================

    @Get('stats/opt-in')
    async getOptInStats(@Request() req) {
        return this.crmService.getOptInStats(req.user.companyId);
    }

    @Get('broadcasts/:id/stats')
    async getBroadcastStats(@Param('id') id: string) {
        return this.crmService.getBroadcastStats(id);
    }
}
