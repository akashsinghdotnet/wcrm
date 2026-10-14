import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('whatsapp_configs')
export class WhatsAppConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    companyId: string;

    @Column({ nullable: true })
    phoneNumberId: string;

    @Column({ type: 'text', nullable: true })
    accessToken: string;

    @Column({ nullable: true })
    businessAccountId: string;

    @Column({ default: false })
    autoReplyEnabled: boolean;

    @Column({ nullable: true })
    autoReplyTemplateName: string;

    @Column({ nullable: true })
    autoReplyTemplateLanguage: string;

    @Column({ type: 'simple-json', nullable: true })
    autoReplyVariableMapping: Record<string, string>;

    @Column({ default: 0 })
    autoReplyDelaySec: number;

    @Column({ default: 'META' })
    provider: string;

    @Column({ nullable: true })
    metaAppId: string;

    @Column({ nullable: true })
    metaAppSecret: string;

    @Column({ nullable: true })
    metaConfigId: string;

    @Column({ nullable: true })
    metaWabaName: string;

    @Column({ nullable: true })
    metaPhoneNumber: string;

    @Column({ default: 'EMBEDDED' })
    setupMethod: 'EMBEDDED' | 'MANUAL';

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
