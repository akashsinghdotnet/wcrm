import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Company } from '../companies/company.entity';

export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    SUPERADMIN_ADMIN = 'superadmin_admin', // Superadmin's admin user
    SUPERADMIN_STAFF = 'superadmin_staff', // Superadmin's staff user
    ADMIN = 'admin',
    MANAGER = 'manager',
    STAFF = 'staff',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    email: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    phone: string;

    @Exclude()
    @Column()
    password: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.STAFF,
    })
    role: UserRole;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    companyId: string;

    @ManyToOne(() => Company, (company) => company.users)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column({ nullable: true })
    twoFactorSecret: string;

    @Column({ default: false })
    isTwoFactorEnabled: boolean;

    @Column({ default: false })
    canCreateInvoices: boolean;

    @Column({ nullable: true })
    resetPasswordToken: string;

    @Column({ nullable: true })
    resetPasswordExpires: Date;

    @Column({ nullable: true })
    pendingEmail: string;

    @Column({ nullable: true })
    emailChangeToken: string;

    @Column({ nullable: true })
    emailChangeExpires: Date;

    @Column({ type: 'int', default: 0 })
    emailOtpResendCount: number;

    @Column({ nullable: true })
    emailOtpLockoutUntil: Date;
}
