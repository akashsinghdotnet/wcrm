import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('module_configs')
export class ModuleConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    companyId: string;

    @Column({ type: 'simple-json', nullable: true })
    activeModules: string[] = ['SALES', 'WHATSAPP', 'CALLING', 'REPORTS'];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
