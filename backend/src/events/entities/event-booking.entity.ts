import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum BookingStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
}

export enum PaymentMethodType {
    RAZORPAY = 'razorpay',
    PAYPAL = 'paypal',
    BANK_TRANSFER = 'bank_transfer',
    FREE = 'free',
}

@Entity('event_bookings')
export class EventBooking {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    eventId: string;

    @Column({ nullable: true })
    ticketTypeId: string;

    @Column({ nullable: true })
    companyId: string;

    // Snapshot of event title at booking time
    @Column({ nullable: true })
    eventTitle: string;

    // Snapshot of ticket type name at booking time
    @Column({ nullable: true })
    ticketTypeName: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    guestEmail: string;

    @Column({ nullable: true })
    guestPhone: string;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ default: 'INR' })
    currency: string;

    @Column({ type: 'varchar', default: BookingStatus.PENDING })
    status: BookingStatus;

    @Column({ type: 'varchar', nullable: true })
    paymentMethod: PaymentMethodType;

    // Razorpay payment_id / PayPal order_id after success
    @Column({ nullable: true })
    paymentId: string;

    // Razorpay order_id / PayPal order_id created during initiation
    @Column({ nullable: true })
    gatewayOrderId: string;

    @Column({ unique: true })
    bookingRef: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;
}
