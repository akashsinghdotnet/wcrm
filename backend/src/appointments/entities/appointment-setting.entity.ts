import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Schedule format: { "0": [], "1": [{"start":"09:00","end":"12:00"},{"start":"16:00","end":"18:00"}], ... }
// Keys are day-of-week (0=Sun ... 6=Sat), values are arrays of time blocks

@Entity('appointment_settings')
export class AppointmentSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    companyId: string;

    @Column({ unique: true, nullable: true })
    bookingSlug: string;

    @Column({ type: 'text', nullable: true })
    schedule: string; // JSON string of per-day time blocks

    @Column({ default: 'UTC' })
    timezone: string;

    @Column({ type: 'text', nullable: true })
    thankYouUrl: string;

    @Column({ type: 'text', nullable: true, default: 'Your appointment has been booked successfully! We look forward to meeting you.' })
    confirmationMessage: string;

    // Design customization for embedded widget
    @Column({ nullable: true, default: '#4f46e5' })
    brandColor: string;

    @Column({ nullable: true, default: '#ffffff' })
    bgColor: string;

    @Column({ nullable: true, default: '#111827' })
    textColor: string;

    @Column({ nullable: true, default: '#ffffff' })
    buttonTextColor: string;

    @Column({ nullable: true, default: '12' })
    borderRadius: string;

    @Column({ nullable: true, default: 'Schedule Event' })
    submitButtonText: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper to get parsed schedule
    getSchedule(): Record<string, { start: string; end: string }[]> {
        if (!this.schedule) {
            // Default Mon-Fri 9-5
            return {
                '0': [],
                '1': [{ start: '09:00', end: '17:00' }],
                '2': [{ start: '09:00', end: '17:00' }],
                '3': [{ start: '09:00', end: '17:00' }],
                '4': [{ start: '09:00', end: '17:00' }],
                '5': [{ start: '09:00', end: '17:00' }],
                '6': [],
            };
        }
        return JSON.parse(this.schedule);
    }
}
