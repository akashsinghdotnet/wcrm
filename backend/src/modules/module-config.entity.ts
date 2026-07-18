import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('module_configs')
export class ModuleConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    companyId: string;

    @Column({ type: 'simple-json', default: '["SALES","FINANCE","MARKETING","WHATSAPP","CALLING","REPORTS","APPOINTMENTS"]' })
    activeModules: string[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
