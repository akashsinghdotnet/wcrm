import { Controller, Get, Post, Patch, Body, Query, Param, Request, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { CallingService } from './calling.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import type { Response } from 'express';

@Controller('calling')
export class CallingController {
    constructor(private readonly callingService: CallingService) { }

    // ─── Config ───

    @Get('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getConfig(@Request() req) {
        return this.callingService.getConfig(req.user.companyId);
    }

    @Post('config')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    saveConfig(@Body() body: any, @Request() req) {
        return this.callingService.saveConfig(req.user.companyId, body);
    }

    // ─── Browser Token ───

    @Get('token')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    generateToken(@Request() req) {
        // Use userId as identity for Twilio
        return this.callingService.generateToken(req.user.companyId, req.user.userId);
    }

    // ─── Initiate Call (creates call log) ───

    @Post('call')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async initiateCall(@Body() body: { leadId: string; phoneNumber: string }, @Request() req) {
        const config = await this.callingService.getConfig(req.user.companyId);
        if (!config) {
            return { error: 'Calling is not configured' };
        }
        return this.callingService.createCallLog({
            companyId: req.user.companyId,
            leadId: body.leadId,
            userId: req.user.userId,
            phoneNumber: body.phoneNumber,
        });
    }

    // ─── Update call SID after Twilio connects ───

    @Patch('call/:id/sid')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async updateCallSid(@Param('id') id: string, @Body() body: { twilioCallSid: string }) {
        const log = await this.callingService.getCallLog(id);
        if (log) {
            log.twilioCallSid = body.twilioCallSid;
            // Save directly through the service
        }
        return { success: true };
    }

    // ─── Save call notes/disposition ───

    @Patch('call/:id/notes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    saveCallNotes(@Param('id') id: string, @Body() body: { disposition: string; notes: string }) {
        return this.callingService.saveCallNotes(id, body.disposition as any, body.notes);
    }

    // ─── Call logs ───

    @Get('logs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    getCallLogs(@Request() req, @Query('leadId') leadId?: string) {
        return this.callingService.getCallLogs(req.user.companyId, leadId);
    }

    // ─── Twilio Webhooks (public, no JWT) ───

    /**
     * TwiML voice webhook — Twilio calls this to get instructions on how to handle the call.
     * POST /api/calling/voice-twiml
     */
    @Post('voice-twiml')
    @HttpCode(HttpStatus.OK)
    async voiceTwiml(@Body() body: any, @Res() res: Response) {
        const to = body.To || body.to;
        const from = body.From || body.Caller || body.from;
        const callSid = body.CallSid;

        // Find config by the "from" phone number or caller
        // The TwiML App passes custom params — we check To field
        if (!to) {
            const twiml = '<Response><Say>No destination number provided.</Say></Response>';
            res.type('text/xml').send(twiml);
            return;
        }

        // Default: use the from number as caller ID, enable recording
        const twiml = this.callingService.generateVoiceTwiml(to, from, true);
        res.type('text/xml').send(twiml);
    }

    /**
     * Twilio call status webhook
     * POST /api/calling/call-status
     */
    @Post('call-status')
    @HttpCode(HttpStatus.OK)
    async callStatus(@Body() body: any) {
        const callSid = body.CallSid;
        const status = body.CallStatus;
        const duration = body.CallDuration ? parseInt(body.CallDuration) : undefined;

        if (callSid && status) {
            await this.callingService.updateCallStatus(callSid, status, duration);
        }
        return '';
    }

    /**
     * Twilio recording status webhook
     * POST /api/calling/recording-status
     */
    @Post('recording-status')
    @HttpCode(HttpStatus.OK)
    async recordingStatus(@Body() body: any) {
        const callSid = body.CallSid;
        const recordingUrl = body.RecordingUrl;
        const recordingSid = body.RecordingSid;

        if (callSid && recordingUrl) {
            await this.callingService.updateRecording(callSid, recordingUrl, recordingSid);
        }
        return '';
    }
}
