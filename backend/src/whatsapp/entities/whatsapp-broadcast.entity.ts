import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/company.entity';
import { User } from '../../users/user.entity';
import { WhatsAppTemplate } from './whatsapp-template.entity';

export enum BroadcastStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    SENDING = 'sending',
    SENT = 'sent',
    FAILED = 'failed',
    PAUSED = 'paused',
}

@Entity('whatsapp_broadcasts')
export class WhatsAppBroadcast {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    createdBy: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdBy' })
    creator: User;

    @Column()
    name: string;

    @Column({ nullable: true })
    templateId: string;

    @ManyToOne(() => WhatsAppTemplate)
    @JoinColumn({ name: 'templateId' })
    template: WhatsAppTemplate;

    @Column({ type: 'text', nullable: true })
    message: string;

    // Target selection
    @Column({ type: 'simple-array', nullable: true })
    targetListIds: string[];

    @Column({ type: 'simple-array', nullable: true })
    targetTagIds: string[];

    @Column({ type: 'simple-array', nullable: true })
    targetContactIds: string[];

    @Column({ default: true })
    onlyOptedIn: boolean; // CRITICAL: Only send to opted-in contacts

    // Scheduling
    @Column({ type: 'timestamp', nullable: true })
    scheduledAt: Date;

    @Column({
        type: 'enum',
        enum: BroadcastStatus,
        default: BroadcastStatus.DRAFT,
    })
    status: BroadcastStatus;

    // Tracking
    @Column({ default: 0 })
    totalRecipients: number;

    @Column({ default: 0 })
    sentCount: number;

    @Column({ default: 0 })
    deliveredCount: number;

    @Column({ default: 0 })
    readCount: number;

    @Column({ default: 0 })
    failedCount: number;

    @Column({ type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
