import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('email_config')
export class EmailConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 'smtp.gmail.com' })
    host: string;

    @Column({ default: 587 })
    port: number;

    @Column()
    user: string;

    @Column()
    pass: string; // Store encrypted in real app, plain for now as per plan

    @Column({ default: 'Wcrm' })
    fromName: string;

    @Column({ nullable: true })
    fromEmail: string;

    @Column({ default: false })
    isSecure: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
