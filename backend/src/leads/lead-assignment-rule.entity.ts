import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { LeadSource } from './lead.entity';

@Entity('lead_assignment_rules')
export class LeadAssignmentRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column({ type: 'enum', enum: LeadSource })
    source: LeadSource;

    @Column()
    assignedTo: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'assignedTo' })
    assignedUser: User;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
