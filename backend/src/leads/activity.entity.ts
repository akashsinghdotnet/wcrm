import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './lead.entity';
import { User } from '../users/user.entity';

export enum ActivityType {
    NOTE = 'note',
    CALL = 'call',
    EMAIL = 'email',
    STATUS_CHANGE = 'status_change',
    WHATSAPP = 'whatsapp',
    ASSIGNMENT = 'assignment',
}

@Entity('activities')
export class Activity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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

    @Column({
        type: 'enum',
        enum: ActivityType,
        default: ActivityType.NOTE,
    })
    type: ActivityType;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn()
    createdAt: Date;
}
