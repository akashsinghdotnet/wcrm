import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Client } from '../clients/client.entity';
import { User } from '../users/user.entity';

export enum LeadSource {
    META_ADS = 'meta_ads',
    GOOGLE_ADS = 'google_ads',
    JUSTDIAL = 'justdial',
    INDIAMART = 'indiamart',
    TRADEINDIA = 'tradeindia',
    WEBSITE = 'website',
    WHATSAPP = 'whatsapp',
    MANUAL = 'manual',
}

export enum LeadStatus {
    NEW = 'new',
    CONTACTED = 'contacted',
    FOLLOW_UP = 'follow_up',
    CONVERTED = 'converted',
    LOST = 'lost',
}

@Entity('leads')
export class Lead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column({ nullable: true })
    clientId: string;

    @ManyToOne(() => Client, { nullable: true })
    @JoinColumn({ name: 'clientId' })
    client: Client;

    @Column()
    name: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({
        type: 'enum',
        enum: LeadSource,
        default: LeadSource.MANUAL,
    })
    source: LeadSource;

    @Column({
        type: 'enum',
        enum: LeadStatus,
        default: LeadStatus.NEW,
    })
    status: LeadStatus;

    @Column({ nullable: true })
    assignedTo: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'assignedTo' })
    assignedUser: User;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'timestamp', nullable: true })
    followUpDate: Date;

    @Column({ nullable: true })
    lastUpdatedBy: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'lastUpdatedBy' })
    lastUpdatedByUser: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
