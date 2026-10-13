import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('user_login_logs')
export class UserLoginLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column()
    userName: string;

    @Column()
    userEmail: string;

    @Column()
    userRole: string;

    @Column({ type: 'uuid', nullable: true })
    companyId: string;

    @CreateDateColumn()
    loginAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    logoutAt: Date;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    location: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;
}
