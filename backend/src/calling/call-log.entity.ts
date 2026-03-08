import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { User } from '../users/user.entity';

export enum CallStatus {
    INITIATED = 'initiated',
    RINGING = 'ringing',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    BUSY = 'busy',
    NO_ANSWER = 'no-answer',
    CANCELED = 'canceled',
}

export enum CallDisposition {
    INTERESTED = 'interested',
    NOT_INTERESTED = 'not_interested',
    CALLBACK = 'callback',
    NO_ANSWER = 'no_answer',
    WRONG_NUMBER = 'wrong_number',
    VOICEMAIL = 'voicemail',
    OTHER = 'other',
}

@Entity('call_logs')
export class CallLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column()
    leadId: string;

    @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'leadId' })
    lead: Lead;

    @Column({ nullable: true })
    userId: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    twilioCallSid: string;

    @Column()
    phoneNumber: string;

    @Column({ type: 'enum', enum: CallStatus, default: CallStatus.INITIATED })
    status: CallStatus;

    @Column({ default: 0 })
    duration: number;

    @Column({ type: 'text', nullable: true })
    recordingUrl: string;

    @Column({ nullable: true })
    recordingSid: string;

    @Column({ type: 'enum', enum: CallDisposition, nullable: true })
    disposition: CallDisposition;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;
}
