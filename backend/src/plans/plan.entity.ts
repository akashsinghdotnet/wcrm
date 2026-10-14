
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Company } from '../companies/company.entity';

@Entity('plans')
export class Plan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ unique: true, nullable: true })
    slug: string;

    @Column('decimal', { precision: 10, scale: 2 })
    priceMonthly: number;

    @Column('decimal', { precision: 10, scale: 2 })
    priceYearly: number;

    @Column({ default: 'USD' })
    currency: string;

    @Column({ default: 1 })
    adminLimit: number;

    @Column({ default: 5 })
    employeeLimit: number;

    @Column('simple-array', { nullable: true })
    features: string[];

    @Column('simple-array', { nullable: true })
    integrations: string[];

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Company, (company) => company.plan)
    companies: Company[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
