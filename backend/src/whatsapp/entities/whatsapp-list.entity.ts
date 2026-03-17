import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Company } from '../../companies/company.entity';
import { WhatsAppContact } from './whatsapp-contact.entity';

@Entity('whatsapp_lists')
export class WhatsAppList {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    color: string; // Hex color for UI

    @ManyToMany(() => WhatsAppContact, contact => contact.lists)
    @JoinTable({
        name: 'whatsapp_list_contacts',
        joinColumn: { name: 'listId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'contactId', referencedColumnName: 'id' },
    })
    contacts: WhatsAppContact[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
