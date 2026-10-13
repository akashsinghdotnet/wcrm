import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('email_logs')
export class EmailLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    to: string;

    @Column()
    subject: string;

    @Column({ type: 'text', nullable: true })
    body: string;

    @Column()
    status: 'sent' | 'failed';

    @Column({ default: 'sent' })
    deliveryStatus: string; // 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'

    @Column({ type: 'timestamp', nullable: true })
    openedAt: Date;

    @Column({ type: 'int', default: 0 })
    openCount: number;

    @Column({ type: 'timestamp', nullable: true })
    clickedAt: Date;

    @Column({ type: 'int', default: 0 })
    clickCount: number;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ nullable: true })
    triggeredBy: string; // User ID who triggered it (or 'system')

    @Column({ type: 'uuid', nullable: true })
    companyId: string;

    @CreateDateColumn()
    sentAt: Date;
}
