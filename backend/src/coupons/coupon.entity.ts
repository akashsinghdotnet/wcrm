import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('coupons')
export class Coupon {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column({ default: 'percentage' })
    type: string; // 'percentage' | 'fixed'

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    value: number;

    @Column({ nullable: true })
    maxUses: number;

    @Column({ default: 0 })
    usedCount: number;

    @Column({ nullable: true })
    expiresAt: Date;

    @Column({ nullable: true })
    description: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 'both' })
    billingCycle: string; // 'both' | 'monthly' | 'yearly'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
