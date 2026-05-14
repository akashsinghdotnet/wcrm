import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('event_ticket_types')
export class EventTicketType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    eventId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ default: 'INR' })
    currency: string;

    // 0 = unlimited
    @Column({ type: 'int', default: 0 })
    quantity: number;

    @Column({ type: 'int', default: 0 })
    quantitySold: number;

    @Column({ type: 'int', default: 10 })
    maxPerBooking: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
