import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Company } from '../../companies/company.entity';
import { WhatsAppContact } from './whatsapp-contact.entity';

@Entity('whatsapp_tags')
export class WhatsAppTag {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    name: string;

    @Column({ nullable: true })
    color: string; // Hex color for UI

    @ManyToMany(() => WhatsAppContact, contact => contact.tags)
    @JoinTable({
        name: 'whatsapp_tag_contacts',
        joinColumn: { name: 'tagId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'contactId', referencedColumnName: 'id' },
    })
    contacts: WhatsAppContact[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
