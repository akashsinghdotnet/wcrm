import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('calling_configs')
export class CallingConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    companyId: string;

    @Column()
    accountSid: string;

    @Column({ type: 'text' })
    authToken: string;

    @Column({ nullable: true })
    twimlAppSid: string;

    @Column({ nullable: true })
    apiKeySid: string;

    @Column({ type: 'text', nullable: true })
    apiKeySecret: string;

    @Column()
    phoneNumber: string;

    @Column({ default: true })
    recordCalls: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
