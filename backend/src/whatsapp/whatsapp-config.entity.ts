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
    provider: 'META' | 'WEB_JS';

    @Column({ nullable: true })
    webJsStatus: string;

    @Column({ nullable: true })
    webJsPhoneNumber: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
