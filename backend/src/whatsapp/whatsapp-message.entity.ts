import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { User } from '../users/user.entity';

export enum MessageDirection {
    INBOUND = 'inbound',
    OUTBOUND = 'outbound',
}

export enum MessageStatus {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

@Entity('whatsapp_messages')
export class WhatsAppMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column({ nullable: true })
    leadId: string;

    @ManyToOne(() => Lead, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'leadId' })
    lead: Lead;

    @Column({ type: 'enum', enum: MessageDirection })
    direction: MessageDirection;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
    status: MessageStatus;

    @Column({ nullable: true })
    whatsappMessageId: string;

    @Column({ type: 'text', nullable: true })
    errorDetail: string;

    @Column({ nullable: true })
    sentBy: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'sentBy' })
    sender: User;

    @CreateDateColumn()
    createdAt: Date;
}
