import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

export enum IntegrationPlatform {
    META = 'meta',
    GOOGLE = 'google',
    JUSTDIAL = 'justdial',
    INDIAMART = 'indiamart',
    TRADEINDIA = 'tradeindia',
    WEBSITE = 'website',
    EMAIL_PARSER = 'email_parser',
}

@Entity('integration_configs')
@Unique(['companyId', 'platform'])
export class IntegrationConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column({ type: 'enum', enum: IntegrationPlatform })
    platform: IntegrationPlatform;

    @Column({ type: 'simple-json', default: '{}' })
    credentials: Record<string, string>;

    @Column({ default: false })
    isActive: boolean;

    @Column({ type: 'timestamp', nullable: true, default: null })
    lastSyncAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
