import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketReply } from './entities/ticket-reply.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { User, UserRole } from '../users/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class TicketsService {
    constructor(
        @InjectRepository(Ticket)
        private ticketRepo: Repository<Ticket>,
        @InjectRepository(TicketReply)
        private replyRepo: Repository<TicketReply>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private emailService: EmailService,
    ) { }

    private generateTicketNumber(): string {
        return `#TCK-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    async createTicket(user: User, dto: CreateTicketDto) {
        const ticketNumber = this.generateTicketNumber();
        const companyId = user.companyId || dto.companyId;

        const ticket = this.ticketRepo.create({
            ...dto,
            ticketNumber,
            companyId,
            createdById: user['userId'] || user.id,
            status: TicketStatus.OPEN,
        });

        await this.ticketRepo.save(ticket);

        this.sendNewTicketEmails(ticket, user).catch(err => console.error('Failed to send new ticket emails:', err));

        return this.findOne(ticket.id, user);
    }

    async findAll(user: User) {
        const isSuperAdmin = [UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.SUPERADMIN_STAFF].includes(user.role);

        const query = this.ticketRepo.createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.company', 'company')
            .leftJoinAndSelect('ticket.createdBy', 'createdBy')
            .orderBy('ticket.createdAt', 'DESC');

        if (!isSuperAdmin) {
            query.where('ticket.companyId = :companyId', { companyId: user.companyId });
        }

        return query.getMany();
    }

    async findOne(id: string, user: User) {
        const ticket = await this.ticketRepo.findOne({
            where: { id },
            relations: ['company', 'createdBy', 'replies', 'replies.user'],
            order: {
                replies: {
                    createdAt: 'ASC',
                }
            }
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        const isSuperAdmin = [UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.SUPERADMIN_STAFF].includes(user.role);
        if (!isSuperAdmin && ticket.companyId !== user.companyId) {
            throw new NotFoundException('Ticket not found');
        }

        return ticket;
    }

    async reply(ticketId: string, user: User, dto: ReplyTicketDto) {
        const ticket = await this.findOne(ticketId, user);

        const reply = this.replyRepo.create({
            message: dto.message,
            attachmentUrl: dto.attachmentUrl || undefined,
            ticketId: ticketId,
            userId: user['userId'] || user.id,
        });

        await this.replyRepo.save(reply);

        const isSuperAdmin = [UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.SUPERADMIN_STAFF].includes(user.role);
        console.log('DEBUG TicketsService.reply - User Role:', user.role, 'isSuperAdmin:', isSuperAdmin);

        if (isSuperAdmin && ticket.status !== TicketStatus.CLOSED) {
            ticket.status = TicketStatus.ANSWERED;
            await this.ticketRepo.update(ticket.id, { status: TicketStatus.ANSWERED });
        } else if (!isSuperAdmin && ticket.status !== TicketStatus.CLOSED) {
            ticket.status = TicketStatus.OPEN;
            await this.ticketRepo.update(ticket.id, { status: TicketStatus.OPEN });
        }

        this.sendReplyEmails(ticket, reply, user).catch(err => console.error('Failed to send ticket reply emails:', err));

        // Refetch to include the newly created reply with user relations, 
        // to send the complete updated thread back to the frontend immediately.
        return this.findOne(ticket.id, user);
    }

    async updateStatus(ticketId: string, dto: UpdateTicketStatusDto, user: User) {
        const ticket = await this.findOne(ticketId, user);
        ticket.status = dto.status;
        return this.ticketRepo.save(ticket);
    }

    private async sendNewTicketEmails(ticket: Ticket, creator: User) {
        const creatorEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #4F46E5;">Support Ticket Raised</h2>
                <p>Hi ${creator.name || 'there'},</p>
                <p>Your support ticket <strong>${ticket.ticketNumber}</strong> has been created successfully.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
                    <p style="margin: 5px 0;"><strong>Department:</strong> ${ticket.department}</p>
                    <p style="margin: 5px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
                </div>
                <p>Our support team will get back to you shortly.</p>
            </div>
        `;
        await this.emailService.sendEmail(creator.email, `Ticket Raised: ${ticket.ticketNumber}`, creatorEmailHtml);

        const superAdmins = await this.userRepo.find({ where: { role: In([UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN]) } });
        const adminHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #dc2626;">New Support Ticket</h2>
                <p>A new support ticket <strong>${ticket.ticketNumber}</strong> was raised by ${creator.name || 'User'} (${creator.email || creator['userId']}).</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
                    <p style="margin: 5px 0;"><strong>Department:</strong> ${ticket.department}</p>
                    <p style="margin: 5px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
                </div>
                <p>Please log in to the admin panel to reply.</p>
            </div>
        `;
        for (const admin of superAdmins) {
            await this.emailService.sendEmail(admin.email, `New Support Ticket: ${ticket.ticketNumber}`, adminHtml);
        }
    }

    private async sendReplyEmails(ticket: Ticket, reply: TicketReply, sender: User) {
        const isSuperAdmin = [UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.SUPERADMIN_STAFF].includes(sender.role);

        if (isSuperAdmin) {
            const creator = await this.userRepo.findOne({ where: { id: ticket.createdById } });
            if (creator) {
                const userHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #4F46E5;">Update on Ticket ${ticket.ticketNumber}</h2>
                        <p>Hi ${creator.name || 'there'},</p>
                        <p>Support has replied to your ticket (<strong>${ticket.subject}</strong>).</p>
                        <p>Log in to your CRM account to view the details and respond.</p>
                    </div>
                `;
                await this.emailService.sendEmail(creator.email, `Reply on Ticket: ${ticket.ticketNumber}`, userHtml);
            }
        } else {
            const superAdmins = await this.userRepo.find({ where: { role: In([UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN]) } });
            const adminHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #dc2626;">New Reply on Ticket ${ticket.ticketNumber}</h2>
                    <p>The user ${sender.name || 'Client'} (${sender.email || sender['email']}) has replied to the ticket <strong>${ticket.subject}</strong>.</p>
                    <p>Log in to the super admin panel to view the details.</p>
                </div>
            `;
            for (const admin of superAdmins) {
                await this.emailService.sendEmail(admin.email, `Client Reply on Ticket: ${ticket.ticketNumber}`, adminHtml);
            }
        }
    }
}
