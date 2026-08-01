import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, AfterLoad } from 'typeorm';

export enum IntegrationPlatform {
    META = 'meta',
    GOOGLE = 'google',
    JUSTDIAL = 'justdial',
    INDIAMART = 'indiamart',
    TRADEINDIA = 'tradeindia',
    WEBSITE = 'website',
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

    @Column({ type: 'simple-json', nullable: true })
    credentials: Record<string, string> = {};

    @Column({ default: false })
    isActive: boolean;

    @Column({ type: 'timestamp', nullable: true, default: null })
    lastSyncAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @AfterLoad()
    parseCredentials() {
        if (typeof this.credentials === 'string') {
            try {
                this.credentials = JSON.parse(this.credentials);
            } catch {
                this.credentials = {};
            }
        }
    }
}
