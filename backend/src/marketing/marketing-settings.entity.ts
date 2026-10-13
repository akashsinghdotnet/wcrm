import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';

@Entity('marketing_settings')
export class MarketingSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    companyId: string | null; // If null, it belongs to Super Admin (system)

    @Column()
    smtpHost: string;

    @Column()
    smtpPort: number;

    @Column()
    smtpUser: string;

    @Column()
    smtpPassword: string; // Should be encrypted in production

    @Column({ default: false })
    smtpSecure: boolean;

    @Column()
    fromEmail: string;

    @Column({ default: 'Wcrm Marketing' })
    fromName: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
