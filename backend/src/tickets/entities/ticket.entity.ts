import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Company } from '../../companies/company.entity';
import { User } from '../../users/user.entity';
import { TicketReply } from './ticket-reply.entity';

export enum TicketDepartment {
    SALES = 'Sales',
    TECHNICAL = 'Technical Support',
}

export enum TicketPriority {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
}

export enum TicketStatus {
    OPEN = 'Open',
    ANSWERED = 'Answered',
    CLOSED = 'Closed',
}

@Entity('tickets')
export class Ticket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    ticketNumber: string;

    @Column()
    subject: string;

    @Column({
        type: 'enum',
        enum: TicketDepartment,
        default: TicketDepartment.TECHNICAL,
    })
    department: TicketDepartment;

    @Column({
        type: 'enum',
        enum: TicketPriority,
        default: TicketPriority.MEDIUM,
    })
    priority: TicketPriority;

    @Column({ type: 'text' })
    description: string;

    @Column({
        type: 'enum',
        enum: TicketStatus,
        default: TicketStatus.OPEN,
    })
    status: TicketStatus;

    @Column({ nullable: true })
    attachmentUrl: string;

    @Column({ nullable: true })
    companyId: string;

    @ManyToOne(() => Company, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    createdById: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @OneToMany(() => TicketReply, (reply) => reply.ticket)
    replies: TicketReply[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
