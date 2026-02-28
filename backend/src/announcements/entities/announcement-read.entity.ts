import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/user.entity';
import { Announcement } from './announcement.entity';

@Entity('announcement_reads')
@Unique(['announcementId', 'userId'])
export class AnnouncementRead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    announcementId: string;

    @ManyToOne(() => Announcement, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'announcementId' })
    announcement: Announcement;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn()
    readAt: Date;
}
