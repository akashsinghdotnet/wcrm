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

    async createTicket(user: User, dto: CreateTicketDto) {
        const count = await this.ticketRepo.count();
        const ticketNumber = `TICK-${(count + 1).toString().padStart(5, '0')}`;

        const ticket = this.ticketRepo.create({
            ticketNumber,
            subject: dto.subject,
            department: dto.department,
            priority: dto.priority,
            description: dto.description,
            attachmentUrl: dto.attachmentUrl || undefined,
            companyId: user.companyId,
            createdById: user['userId'] || user.id,
            status: TicketStatus.OPEN,
        });

        await this.ticketRepo.save(ticket);

        this.sendNewTicketEmails(ticket, user).catch(err => console.error('Failed to send new ticket emails:', err));

        return this.findOne(ticket.id, user);
    }

    async findAll(user: User) {
        const query = this.ticketRepo.createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.company', 'company')
            .leftJoinAndSelect('ticket.createdBy', 'createdBy')
            .orderBy('ticket.createdAt', 'DESC');

        if (user.companyId) {
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

        const isAdmin = user.role === UserRole.ADMIN;
        if (isAdmin && ticket.status !== TicketStatus.CLOSED) {
            ticket.status = TicketStatus.ANSWERED;
            await this.ticketRepo.update(ticket.id, { status: TicketStatus.ANSWERED });
        } else if (!isAdmin && ticket.status !== TicketStatus.CLOSED) {
            ticket.status = TicketStatus.OPEN;
            await this.ticketRepo.update(ticket.id, { status: TicketStatus.OPEN });
        }

        this.sendReplyEmails(ticket, reply, user).catch(err => console.error('Failed to send ticket reply emails:', err));

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
            </div>
        `;
        await this.emailService.sendEmail(creator.email, `Ticket Raised: ${ticket.ticketNumber}`, creatorEmailHtml);

        const admins = await this.userRepo.find({ where: { role: UserRole.ADMIN } });
        const adminHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #dc2626;">New Support Ticket</h2>
                <p>A new support ticket <strong>${ticket.ticketNumber}</strong> was raised by ${creator.name || 'User'}.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
                    <p style="margin: 5px 0;"><strong>Department:</strong> ${ticket.department}</p>
                    <p style="margin: 5px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
                </div>
            </div>
        `;
        for (const admin of admins) {
            await this.emailService.sendEmail(admin.email, `New Support Ticket: ${ticket.ticketNumber}`, adminHtml);
        }
    }

    private async sendReplyEmails(ticket: Ticket, reply: TicketReply, sender: User) {
        const isAdmin = sender.role === UserRole.ADMIN;

        if (isAdmin) {
            const creator = await this.userRepo.findOne({ where: { id: ticket.createdById } });
            if (creator) {
                const userHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #4F46E5;">Update on Ticket ${ticket.ticketNumber}</h2>
                        <p>Hi ${creator.name || 'there'},</p>
                        <p>Admin has replied to your ticket (<strong>${ticket.subject}</strong>).</p>
                    </div>
                `;
                await this.emailService.sendEmail(creator.email, `Reply on Ticket: ${ticket.ticketNumber}`, userHtml);
            }
        } else {
            const admins = await this.userRepo.find({ where: { role: UserRole.ADMIN } });
            const adminHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #dc2626;">New Reply on Ticket ${ticket.ticketNumber}</h2>
                    <p>${sender.name || 'User'} has replied to the ticket <strong>${ticket.subject}</strong>.</p>
                </div>
            `;
            for (const admin of admins) {
                await this.emailService.sendEmail(admin.email, `New Reply on Ticket: ${ticket.ticketNumber}`, adminHtml);
            }
        }
    }
}
