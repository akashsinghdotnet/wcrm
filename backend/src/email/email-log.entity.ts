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

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ nullable: true })
    triggeredBy: string; // User ID who triggered it (or 'system')

    @Column({ type: 'uuid', nullable: true })
    companyId: string;

    @CreateDateColumn()
    sentAt: Date;
}
