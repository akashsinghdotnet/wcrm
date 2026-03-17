import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WhatsAppBroadcast } from './whatsapp-broadcast.entity';
import { WhatsAppContact } from './whatsapp-contact.entity';

export enum MessageStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

@Entity('whatsapp_broadcast_logs')
export class WhatsAppBroadcastLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    broadcastId: string;

    @ManyToOne(() => WhatsAppBroadcast)
    @JoinColumn({ name: 'broadcastId' })
    broadcast: WhatsAppBroadcast;

    @Column()
    contactId: string;

    @ManyToOne(() => WhatsAppContact)
    @JoinColumn({ name: 'contactId' })
    contact: WhatsAppContact;

    @Column()
    phone: string;

    @Column({
        type: 'enum',
        enum: MessageStatus,
        default: MessageStatus.PENDING,
    })
    status: MessageStatus;

    @Column({ nullable: true })
    whatsappMessageId: string; // ID from WhatsApp API

    @Column({ type: 'timestamp', nullable: true })
    sentAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    deliveredAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn()
    createdAt: Date;
}
