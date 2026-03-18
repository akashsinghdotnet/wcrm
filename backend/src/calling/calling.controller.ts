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
        await this.callingService.saveCallSid(id, body.twilioCallSid);
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

        if (!to) {
            const twiml = '<Response><Say>No destination number provided.</Say></Response>';
            res.type('text/xml').send(twiml);
            return;
        }

        // Look up the company's Twilio phone number to use as callerId
        // The "from" field from browser SDK is "client:userId", not a valid phone number
        let callerId = from;
        let record = true;

        if (from && from.startsWith('client:')) {
            // Extract userId from client identity and find their company config
            const userId = from.replace('client:', '');
            const config = await this.callingService.getConfigByUserId(userId);
            if (config) {
                callerId = config.phoneNumber;
                record = config.recordCalls;
            }
        }

        const twiml = this.callingService.generateVoiceTwiml(to, callerId, record);
        res.type('text/xml').send(twiml);
    }

    /**
     * Twilio call status webhook
     * POST /api/calling/call-status
     */
    @Post('call-status')
    @HttpCode(HttpStatus.OK)
    async callStatus(@Body() body: any, @Res() res: Response) {
        const callSid = body.CallSid;
        // <Dial> action sends DialCallStatus/DialCallDuration; <Number> statusCallback sends CallStatus/CallDuration
        const status = body.DialCallStatus || body.CallStatus;
        const duration = body.DialCallDuration || body.CallDuration;
        const durationNum = duration ? parseInt(duration) : undefined;

        if (callSid && status) {
            await this.callingService.updateCallStatus(callSid, status, durationNum);
        }
        // Return empty TwiML response (required when used as <Dial> action URL)
        res.type('text/xml').send('<Response></Response>');
    }

    // ─── Stream recording audio (proxy to Twilio with auth) ───

    @Get('recording/:callLogId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async streamRecording(@Param('callLogId') callLogId: string, @Res() res: Response) {
        const audioBuffer = await this.callingService.fetchRecording(callLogId);
        if (!audioBuffer) {
            res.status(404).json({ message: 'Recording not found' });
            return;
        }
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'public, max-age=86400',
        });
        res.send(audioBuffer);
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
