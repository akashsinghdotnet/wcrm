import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Client } from '../clients/client.entity';

export enum InvoiceStatus {
    PENDING = 'pending',
    PAID = 'paid',
    OVERDUE = 'overdue',
}

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @ManyToOne(() => Company, { nullable: true })
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column({ nullable: true })
    clientId: string;

    @ManyToOne(() => Client, { nullable: true })
    @JoinColumn({ name: 'clientId' })
    client: Client;

    // Guest client details (for invoices without linked client)
    @Column({ nullable: true })
    guestClientName: string;

    @Column({ nullable: true })
    guestClientEmail: string;

    @Column({ nullable: true })
    guestClientPhone: string;

    @Column({ type: 'text', nullable: true })
    guestClientAddress: string;

    @Column({ nullable: true })
    clientGst: string;

    @Column({ default: false })
    isSystem: boolean;

    @Column({ nullable: true })
    targetCompanyId: string;

    @ManyToOne(() => Company, { nullable: true })
    @JoinColumn({ name: 'targetCompanyId' })
    targetCompany: Company;

    @Column({ unique: true, nullable: true })
    invoiceNumber: string;

    @Column({ type: 'date', nullable: true })
    invoiceDate: Date;

    @Column({ type: 'date', nullable: true })
    dueDate: Date;

    @Column('decimal', { precision: 12, scale: 2 })
    amount: number; // This can be treated as 'total' for backward compatibility or the final payable amount

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    subtotal: number;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    tax: number;

    @Column('simple-json', { nullable: true })
    items: any;

    @Column()
    month: string; // e.g. "Feb 2026"

    @Column({
        type: 'enum',
        enum: InvoiceStatus,
        default: InvoiceStatus.PENDING,
    })
    status: InvoiceStatus;

    @Column({ type: 'date', nullable: true })
    paidDate: Date;

    @Column({ nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;
}
