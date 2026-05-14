import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MeetingType } from './meeting-type.entity';

@Entity('appointments')
export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column()
    guestName: string;

    @Column()
    guestEmail: string;

    @Column({ nullable: true })
    guestPhone: string;

    @Column({ type: 'text', nullable: true })
    guestNotes: string;

    @Column({ type: 'date' })
    date: string; // YYYY-MM-DD

    @Column()
    startTime: string; // HH:mm

    @Column()
    endTime: string; // HH:mm

    @Column({ default: 'booked' }) // booked, cancelled
    status: string;

    @Column({ nullable: true })
    meetingTypeId: string;

    @ManyToOne(() => MeetingType, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'meetingTypeId' })
    meetingType: MeetingType;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
