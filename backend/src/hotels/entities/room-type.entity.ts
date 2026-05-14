import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity('hotel_room_types')
export class RoomType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column()
    hotelId: string;

    @ManyToOne(() => Hotel, (h) => h.roomTypes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'hotelId' })
    hotel: Hotel;

    @Column()
    name: string; // e.g. "Deluxe King", "Standard Twin", "Suite"

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    pricePerNight: number;

    @Column({ default: 2 })
    capacity: number; // max guests

    @Column({ default: 1 })
    totalRooms: number; // physical room count for availability check

    @Column({ type: 'text', nullable: true })
    amenities: string; // JSON array e.g. ["WiFi","AC","TV"]

    @Column({ type: 'text', nullable: true })
    images: string; // JSON array of image URLs

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
