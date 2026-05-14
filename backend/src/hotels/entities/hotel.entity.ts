import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RoomType } from './room-type.entity';
import { HotelBooking } from './hotel-booking.entity';

@Entity('hotels')
export class Hotel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    website: string;

    @Column({ default: '14:00' })
    checkInTime: string;

    @Column({ default: '11:00' })
    checkOutTime: string;

    @Column({ unique: true })
    slug: string;

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ nullable: true })
    coverImageUrl: string;

    @Column({ nullable: true, default: '#4f46e5' })
    brandColor: string;

    @Column({ nullable: true })
    confirmationMessage: string;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => RoomType, (rt) => rt.hotel)
    roomTypes: RoomType[];

    @OneToMany(() => HotelBooking, (b) => b.hotel)
    bookings: HotelBooking[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
