import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../companies/company.entity';

export enum ClientStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    CLOSED = 'closed',
}

@Entity('clients')
export class Client {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company, (company) => company.clients)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    clientName: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    gstNo: string;

    @Column({ nullable: true })
    serviceType: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    monthlyFee: number;

    @Column({
        type: 'enum',
        enum: ClientStatus,
        default: ClientStatus.ACTIVE,
    })
    status: ClientStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
