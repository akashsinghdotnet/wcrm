import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';

@Entity('invoice_settings')
export class InvoiceSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, nullable: true })
    companyId: string;

    @OneToOne(() => Company, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ nullable: true })
    gstNo: string;

    @Column({ nullable: true })
    prefix: string;

    @Column({ type: 'text', nullable: true })
    terms: string;

    @Column({ nullable: true })
    bankName: string;

    @Column({ nullable: true })
    accountNumber: string;

    @Column({ nullable: true })
    ifscCode: string;

    @Column({ nullable: true })
    accountHolderName: string;

    @Column({ nullable: true })
    upiId: string;

    @Column({ type: 'text', nullable: true })
    upiQrUrl: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
