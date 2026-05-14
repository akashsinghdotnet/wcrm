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

    @Column({ length: 100, nullable: true })
    whatsappMessageId: string;

    @Column({ type: 'varchar', length: 50, default: 'text' })
    messageType: string;

    @Column({ length: 150, nullable: true })
    mediaId: string;

    @Column({ length: 100, nullable: true })
    mimeType: string;

    @Column({ type: 'text', nullable: true })
    errorDetail: string;

    @Column({ nullable: true })
    sentBy: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'sentBy' })
    sender: User;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'json', nullable: true })
    referral: any;
}
