import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('settings')
export class Setting {
    @PrimaryColumn()
    key: string;

    @Column({ type: 'text', nullable: true })
    value: string;

    @Column({ default: false })
    isPublic: boolean;
}
