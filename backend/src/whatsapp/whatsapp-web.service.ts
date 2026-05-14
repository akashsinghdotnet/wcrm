import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppConfig } from './whatsapp-config.entity';
import { WhatsAppMessage, MessageDirection, MessageStatus } from './whatsapp-message.entity';
import { Lead } from '../leads/lead.entity';
import { Activity, ActivityType } from '../leads/activity.entity';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
import * as qrcode from 'qrcode';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class WhatsAppWebService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WhatsAppWebService.name);
    // Map of companyId to Baileys socket
    private clients: Map<string, any> = new Map();
    // Map of companyId to latest QR Code Data URL
    private qrCodes: Map<string, string> = new Map();
    private SESSIONS_DIR = path.join(process.cwd(), 'whatsapp-sessions');

    constructor(
        @InjectRepository(WhatsAppConfig) private configRepo: Repository<WhatsAppConfig>,
        @InjectRepository(WhatsAppMessage) private messageRepo: Repository<WhatsAppMessage>,
        @InjectRepository(Lead) private leadRepo: Repository<Lead>,
        @InjectRepository(Activity) private activityRepo: Repository<Activity>,
    ) {
        if (!fs.existsSync(this.SESSIONS_DIR)) {
            fs.mkdirSync(this.SESSIONS_DIR, { recursive: true });
        }
    }

    async onModuleInit() {
        const configs = await this.configRepo.find({ where: { provider: 'WEB_JS' } });
        for (const config of configs) {
            await this.initClient(config.companyId);
        }
    }

    async onModuleDestroy() {
        for (const [companyId, sock] of this.clients.entries()) {
            this.logger.log(`Destroying WhatsApp Web client for company ${companyId}`);
            try { sock.logout(); } catch (e) {}
        }
    }

    async getStatus(companyId: string) {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config || config.provider !== 'WEB_JS') {
            return { active: false, status: 'NOT_CONFIGURED', qrCode: null };
        }
        return {
            active: true,
            status: config.webJsStatus || 'disconnected',
            phoneNumber: config.webJsPhoneNumber || null,
            qrCode: this.qrCodes.get(companyId) || null,
        };
    }

    async restartClient(companyId: string) {
        if (this.clients.has(companyId)) {
            const sock = this.clients.get(companyId)!;
            try { sock.logout(); } catch (e) {}
            this.clients.delete(companyId);
            this.qrCodes.delete(companyId);
        }
        // clear session dir to force fresh
        this.clearSessionFiles(companyId);
        await this.configRepo.update({ companyId }, { provider: 'WEB_JS', webJsStatus: 'connecting', webJsPhoneNumber: undefined });
        await this.initClient(companyId);
        return { success: true };
    }

    async logoutClient(companyId: string) {
        if (this.clients.has(companyId)) {
            const sock = this.clients.get(companyId)!;
            try { sock.logout(); } catch (e) {}
            this.clients.delete(companyId);
        }
        this.qrCodes.delete(companyId);
        this.clearSessionFiles(companyId);
        await this.configRepo.update({ companyId }, { provider: 'META', webJsStatus: 'disconnected', webJsPhoneNumber: undefined });
        return { success: true };
    }

    private clearSessionFiles(companyId: string) {
        const sessionPath = path.join(this.SESSIONS_DIR, `session-${companyId}`);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
    }

    async initClient(companyId: string) {
        if (this.clients.has(companyId)) return;

        this.logger.log(`Initializing Baileys client for company ${companyId}`);
        const sessionPath = path.join(this.SESSIONS_DIR, `session-${companyId}`);
        
        try {
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                browser: Browsers.macOS('Desktop'),
                syncFullHistory: false
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    this.logger.log(`Received QR for company ${companyId}`);
                    try {
                        const qrDataUrl = await qrcode.toDataURL(qr);
                        this.qrCodes.set(companyId, qrDataUrl);
                        await this.configRepo.update({ companyId }, { webJsStatus: 'qr_ready' });
                    } catch (err) {
                        this.logger.error('Failed to generate QR data URL', err);
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.logger.log(`Connection closed for ${companyId}. Reconnecting: ${shouldReconnect}`);
                    this.clients.delete(companyId);
                    
                    if (shouldReconnect) {
                        await this.configRepo.update({ companyId }, { webJsStatus: 'connecting' });
                        setTimeout(() => this.initClient(companyId), 5000);
                    } else {
                        await this.configRepo.update({ companyId }, { webJsStatus: 'disconnected', webJsPhoneNumber: undefined });
                        this.clearSessionFiles(companyId);
                    }
                }

                if (connection === 'open') {
                    this.logger.log(`Baileys socket opened for company ${companyId}`);
                    this.qrCodes.delete(companyId);
                    const userJid = sock.user?.id || '';
                    const phone = userJid.split(':')[0].split('@')[0];
                    await this.configRepo.update({ companyId }, { 
                        webJsStatus: 'connected', 
                        webJsPhoneNumber: phone || 'Unknown'
                    });
                }
            });

            sock.ev.on('messages.upsert', async (m) => {
                if (m.type === 'notify') {
                    for (const msg of m.messages) {
                        if (!msg.message || msg.key.fromMe) continue;
                        await this.handleIncomingMessage(companyId, msg);
                    }
                }
            });

            this.clients.set(companyId, sock);

        } catch (err) {
            this.logger.error(`Failed to initialize client for ${companyId}`, err);
            this.clients.delete(companyId);
            await this.configRepo.update({ companyId }, { webJsStatus: 'error' });
        }
    }

    async sendMessageToLead(companyId: string, leadId: string, content: string, userId: string, replyToMessageId?: string) {
        const sock = this.clients.get(companyId);
        if (!sock) throw new Error('WhatsApp Web client is not connected');

        const lead = await this.leadRepo.findOne({ where: { id: leadId, companyId } });
        if (!lead || !lead.phone) throw new Error('Lead does not have a valid phone number');

        let phone = lead.phone.replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = '91' + phone;
        const jid = `${phone}@s.whatsapp.net`;

        try {
            const sentMsg = await sock.sendMessage(jid, { text: content });

            const msgEntity = this.messageRepo.create({
                companyId,
                leadId,
                direction: MessageDirection.OUTBOUND,
                content: content,
                status: MessageStatus.DELIVERED,
                whatsappMessageId: sentMsg?.key?.id || `out_${Date.now()}`,
                sentBy: userId,
                messageType: 'text',
            });
            await this.messageRepo.save(msgEntity);

            await this.activityRepo.save(this.activityRepo.create({
                leadId,
                userId,
                type: ActivityType.WHATSAPP,
                content: `WhatsApp message sent: "${content}"`
            }));

            return msgEntity;
        } catch (error) {
            this.logger.error(`Failed to send message via Baileys for company ${companyId}`, error);
            throw new Error('Failed to send message via WhatsApp Web');
        }
    }

    private async handleIncomingMessage(companyId: string, msg: any) {
        const jid = msg.key.remoteJid;
        if (!jid || jid === 'status@broadcast') return;
        if (jid.includes('@g.us')) return; // ignore groups for now

        const phoneRaw = jid.split('@')[0];
        const phoneLast10 = phoneRaw.slice(-10);
        
        let lead = await this.leadRepo.createQueryBuilder('lead')
            .where('lead.companyId = :companyId', { companyId })
            .andWhere('lead.phone LIKE :phone', { phone: `%${phoneLast10}%` })
            .getOne();

        if (!lead) return;

        const msgId = msg.key.id;
        const exists = await this.messageRepo.findOne({ where: { whatsappMessageId: msgId } });
        if (exists) return;

        let content = '';
        let type = 'text';

        if (msg.message?.conversation) {
            content = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
        } else if (msg.message?.imageMessage) {
            content = '[Image Received]';
            type = 'image';
        } else if (msg.message?.videoMessage) {
            content = '[Video Received]';
            type = 'video';
        } else if (msg.message?.audioMessage) {
            content = '[Audio Received]';
            type = 'audio';
        } else if (msg.message?.documentMessage) {
            content = '[Document Received]';
            type = 'document';
        }

        if (!content) return;

        const msgEntity = this.messageRepo.create({
            companyId,
            leadId: lead.id,
            direction: MessageDirection.INBOUND,
            content,
            status: MessageStatus.DELIVERED,
            whatsappMessageId: msgId,
            messageType: type,
        });
        await this.messageRepo.save(msgEntity);

        await this.activityRepo.save(this.activityRepo.create({
            leadId: lead.id,
            userId: lead.assignedTo,
            type: ActivityType.WHATSAPP,
            content: `WhatsApp message received: "${content}"`
        }));
    }
}
