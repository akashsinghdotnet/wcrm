import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EventStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    CANCELLED = 'cancelled',
}

@Entity('events')
export class Event {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    title: string;

    @Column()
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    bannerImage: string;

    @Column({ nullable: true })
    category: string;

    @Column({ type: 'date', nullable: true })
    startDate: string;

    @Column({ type: 'date', nullable: true })
    endDate: string;

    @Column({ nullable: true })
    startTime: string;

    @Column({ nullable: true })
    endTime: string;

    @Column({ nullable: true })
    timezone: string;

    @Column({ type: 'int', default: 0 })
    capacity: number;

    @Column({
        type: 'varchar',
        default: EventStatus.DRAFT,
    })
    status: EventStatus;

    @Column({ default: true })
    isPublic: boolean;

    @Column({ nullable: true })
    tags: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ default: 'INR' })
    currency: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
