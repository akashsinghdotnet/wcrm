import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Hotel } from './hotel.entity';
import { RoomType } from './room-type.entity';

@Entity('hotel_bookings')
export class HotelBooking {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column()
    hotelId: string;

    @ManyToOne(() => Hotel, (h) => h.bookings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'hotelId' })
    hotel: Hotel;

    @Column({ nullable: true })
    roomTypeId: string;

    @ManyToOne(() => RoomType, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'roomTypeId' })
    roomType: RoomType;

    @Column()
    guestName: string;

    @Column()
    guestEmail: string;

    @Column({ nullable: true })
    guestPhone: string;

    @Column({ type: 'text', nullable: true })
    guestNotes: string; // special requests

    @Column({ type: 'date' })
    checkIn: string; // YYYY-MM-DD

    @Column({ type: 'date' })
    checkOut: string; // YYYY-MM-DD

    @Column({ default: 1 })
    nights: number;

    @Column({ default: 1 })
    guests: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ default: 'pending' }) // pending, confirmed, checked_in, checked_out, cancelled
    status: string;

    @Column({ nullable: true })
    leadId: string;

    @Column({ nullable: true })
    confirmationCode: string;

    @Column({ default: 'direct' }) // direct, widget, admin
    source: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
