import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Company } from '../../companies/company.entity';
import { WhatsAppList } from './whatsapp-list.entity';
import { WhatsAppTag } from './whatsapp-tag.entity';

@Entity('whatsapp_contacts')
export class WhatsAppContact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    name: string;

    @Column({ unique: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    // Opt-in tracking (CRITICAL for compliance)
    @Column({ default: false })
    isOptedIn: boolean;

    @Column({ type: 'timestamp', nullable: true })
    optInDate: Date | null;

    @Column({ nullable: true })
    optInSource: string; // 'manual', 'form', 'imported', 'lead_form', etc.

    @Column({ default: false })
    isOptedOut: boolean;

    @Column({ type: 'timestamp', nullable: true })
    optOutDate: Date | null;

    // Additional fields
    @Column({ type: 'json', nullable: true })
    customFields: Record<string, any>;

    // Last interaction tracking
    @Column({ type: 'timestamp', nullable: true })
    lastMessageDate: Date;

    @Column({ nullable: true })
    lastMessageType: string; // 'sent', 'received'

    @ManyToMany(() => WhatsAppList, list => list.contacts)
    lists: WhatsAppList[];

    @ManyToMany(() => WhatsAppTag, tag => tag.contacts)
    tags: WhatsAppTag[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
