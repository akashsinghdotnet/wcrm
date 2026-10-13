import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';
import { Plan } from '../plans/plan.entity';

@Entity('companies')
export class Company {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyName: string;

    @Column({ nullable: true })
    ownerUserId: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    gstNo: string;

    @Column({ nullable: true })
    logoUrl: string;

    @ManyToOne(() => Plan, (plan) => plan.companies, { nullable: true })
    plan: Plan;

    @Column({ nullable: true })
    planId: string;

    @Column({ default: 'active' }) // active, past_due, cancelled
    subscriptionStatus: string;

    @Column({ default: 'monthly' })
    subscriptionPeriod: 'monthly' | 'yearly';

    @Column({ type: 'timestamp', nullable: true })
    renewalDate: Date;

    @OneToMany(() => User, (user) => user.company)
    users: User[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
