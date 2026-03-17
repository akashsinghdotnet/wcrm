import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/company.entity';

export enum TemplateStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum TemplateCategory {
    MARKETING = 'marketing',
    UTILITY = 'utility',
    AUTHENTICATION = 'authentication',
}

@Entity('whatsapp_templates')
export class WhatsAppTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    name: string;

    @Column({ type: 'text' })
    content: string;

    @Column({
        type: 'enum',
        enum: TemplateCategory,
        default: TemplateCategory.MARKETING,
    })
    category: TemplateCategory;

    @Column({
        type: 'enum',
        enum: TemplateStatus,
        default: TemplateStatus.PENDING,
    })
    status: TemplateStatus;

    @Column({ nullable: true })
    metaTemplateId: string; // ID from Meta after approval

    @Column({ type: 'simple-array', nullable: true })
    variables: string[]; // e.g., ['name', 'date', 'amount']

    @Column({ nullable: true })
    language: string; // e.g., 'en', 'hi'

    @Column({ type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
