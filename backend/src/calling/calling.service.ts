import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallingConfig } from './calling-config.entity';
import { CallLog, CallStatus, CallDisposition } from './call-log.entity';
import { Activity, ActivityType } from '../leads/activity.entity';
import * as twilio from 'twilio';

@Injectable()
export class CallingService {
    private readonly logger = new Logger(CallingService.name);

    constructor(
        @InjectRepository(CallingConfig)
        private configRepo: Repository<CallingConfig>,
        @InjectRepository(CallLog)
        private callLogRepo: Repository<CallLog>,
        @InjectRepository(Activity)
        private activityRepo: Repository<Activity>,
    ) { }

    // ─── Config CRUD ───

    async getConfig(companyId: string): Promise<CallingConfig | null> {
        return this.configRepo.findOne({ where: { companyId } });
    }

    async getConfigByUserId(userId: string): Promise<CallingConfig | null> {
        return this.configRepo
            .createQueryBuilder('config')
            .innerJoin('users', 'u', 'u.companyId = config.companyId')
            .where('u.id = :userId', { userId })
            .getOne();
    }

    async saveConfig(companyId: string, dto: {
        accountSid: string;
        authToken: string;
        phoneNumber: string;
        recordCalls?: boolean;
    }): Promise<CallingConfig> {
        let config = await this.configRepo.findOne({ where: { companyId } });

        // Create TwiML App and API Key for browser calling
        const client = twilio.default(dto.accountSid, dto.authToken);

        let twimlAppSid = config?.twimlAppSid;
        let apiKeySid = config?.apiKeySid;
        let apiKeySecret = config?.apiKeySecret;

        try {
            // Create or update TwiML App for voice
            if (!twimlAppSid) {
                const app = await client.applications.create({
                    friendlyName: 'MagnetCRM Browser Calling',
                    voiceMethod: 'POST',
                    voiceUrl: `${process.env.API_URL || 'https://api.magnetcrm.com'}/api/calling/voice-twiml`,
                });
                twimlAppSid = app.sid;
                this.logger.log(`Created TwiML App: ${twimlAppSid}`);
            } else {
                // Update the voice URL in case API_URL changed
                await client.applications(twimlAppSid).update({
                    voiceUrl: `${process.env.API_URL || 'https://api.magnetcrm.com'}/api/calling/voice-twiml`,
                });
            }

            // Create API Key for generating access tokens
            if (!apiKeySid) {
                const key = await client.newKeys.create({
                    friendlyName: 'MagnetCRM Browser Token Key',
                });
                apiKeySid = key.sid;
                apiKeySecret = key.secret;
                this.logger.log(`Created API Key: ${apiKeySid}`);
            }
        } catch (error: any) {
            this.logger.error(`Twilio setup error: ${error.message}`);
            throw new BadRequestException(`Twilio setup failed: ${error.message}. Please verify your Account SID and Auth Token.`);
        }

        if (config) {
            config.accountSid = dto.accountSid;
            config.authToken = dto.authToken;
            config.phoneNumber = dto.phoneNumber;
            config.twimlAppSid = twimlAppSid;
            config.apiKeySid = apiKeySid;
            config.apiKeySecret = apiKeySecret || config.apiKeySecret;
            if (dto.recordCalls !== undefined) config.recordCalls = dto.recordCalls;
        } else {
            config = this.configRepo.create({
                companyId,
                accountSid: dto.accountSid,
                authToken: dto.authToken,
                phoneNumber: dto.phoneNumber,
                twimlAppSid,
                apiKeySid,
                apiKeySecret,
                recordCalls: dto.recordCalls ?? true,
            });
        }

        return this.configRepo.save(config);
    }

    // ─── Access Token for Browser SDK ───

    async generateToken(companyId: string, identity: string): Promise<{ token: string }> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config || !config.apiKeySid || !config.apiKeySecret || !config.twimlAppSid) {
            throw new BadRequestException('Calling is not configured. Go to Settings → Calling to set up Twilio.');
        }

        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        const token = new AccessToken(
            config.accountSid,
            config.apiKeySid,
            config.apiKeySecret,
            { identity, ttl: 3600 },
        );

        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: config.twimlAppSid,
            incomingAllow: false,
        });

        token.addGrant(voiceGrant);

        return { token: token.toJwt() };
    }

    // ─── TwiML for outbound calls ───

    generateVoiceTwiml(to: string, callerId: string, record: boolean): string {
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();

        const apiUrl = process.env.API_URL || 'https://api.magnetcrm.com';
        const dial = response.dial({
            callerId,
            record: record ? 'record-from-answer-dual' : 'do-not-record',
            recordingStatusCallback: `${apiUrl}/api/calling/recording-status`,
            recordingStatusCallbackMethod: 'POST',
            action: `${apiUrl}/api/calling/call-status`,
            method: 'POST',
        });
        dial.number({
            statusCallback: `${apiUrl}/api/calling/call-status`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
        }, to);

        return response.toString();
    }

    // ─── Call Logs ───

    async createCallLog(data: {
        companyId: string;
        leadId: string;
        userId: string;
        phoneNumber: string;
        twilioCallSid?: string;
    }): Promise<CallLog> {
        const log = this.callLogRepo.create({
            ...data,
            status: CallStatus.INITIATED,
        });
        return this.callLogRepo.save(log);
    }

    async saveCallSid(callLogId: string, twilioCallSid: string): Promise<void> {
        const log = await this.callLogRepo.findOne({ where: { id: callLogId } });
        if (!log) return;
        log.twilioCallSid = twilioCallSid;
        await this.callLogRepo.save(log);
    }

    async updateCallStatus(callSid: string, status: string, duration?: number): Promise<void> {
        const log = await this.callLogRepo.findOne({ where: { twilioCallSid: callSid } });
        if (!log) return;

        log.status = status as CallStatus;
        if (duration) log.duration = duration;
        await this.callLogRepo.save(log);

        // Log activity when call completes
        if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
            const durationStr = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '0s';
            const activity = this.activityRepo.create({
                leadId: log.leadId,
                userId: log.userId,
                type: ActivityType.CALL,
                content: status === 'completed'
                    ? `Call completed (${durationStr})`
                    : `Call ${status}`,
            });
            await this.activityRepo.save(activity);
        }
    }

    async updateRecording(callSid: string, recordingUrl: string, recordingSid: string): Promise<void> {
        const log = await this.callLogRepo.findOne({ where: { twilioCallSid: callSid } });
        if (!log) return;

        log.recordingUrl = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;
        log.recordingSid = recordingSid;
        await this.callLogRepo.save(log);
    }

    async saveCallNotes(callLogId: string, disposition: CallDisposition, notes: string): Promise<CallLog> {
        const log = await this.callLogRepo.findOne({ where: { id: callLogId } });
        if (!log) throw new BadRequestException('Call log not found');

        log.disposition = disposition;
        log.notes = notes;
        await this.callLogRepo.save(log);

        // Update the activity with disposition
        if (disposition) {
            const activity = this.activityRepo.create({
                leadId: log.leadId,
                userId: log.userId,
                type: ActivityType.CALL,
                content: `Call outcome: ${disposition.replace(/_/g, ' ')}${notes ? ` — ${notes}` : ''}`,
            });
            await this.activityRepo.save(activity);
        }

        return log;
    }

    async getCallLogs(companyId: string, leadId?: string): Promise<CallLog[]> {
        const where: any = { companyId };
        if (leadId) where.leadId = leadId;

        return this.callLogRepo.find({
            where,
            order: { createdAt: 'DESC' },
            relations: ['user'],
            take: 50,
        });
    }

    async fetchRecording(callLogId: string): Promise<Buffer | null> {
        const log = await this.callLogRepo.findOne({ where: { id: callLogId } });
        if (!log || !log.recordingUrl) return null;

        // Get Twilio credentials for this company
        const config = await this.configRepo.findOne({ where: { companyId: log.companyId } });
        if (!config) return null;

        try {
            const url = log.recordingUrl.endsWith('.mp3') ? log.recordingUrl : `${log.recordingUrl}.mp3`;
            const authHeader = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
            const response = await fetch(url, {
                headers: { 'Authorization': `Basic ${authHeader}` },
                redirect: 'follow',
            });
            if (!response.ok) return null;
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (err) {
            this.logger.error(`Failed to fetch recording: ${err.message}`);
            return null;
        }
    }

    async getCallLog(id: string): Promise<CallLog | null> {
        return this.callLogRepo.findOne({ where: { id }, relations: ['user', 'lead'] });
    }
}
