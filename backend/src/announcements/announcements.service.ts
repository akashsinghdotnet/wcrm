import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementRead } from './entities/announcement-read.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AnnouncementsService {
    constructor(
        @InjectRepository(Announcement)
        private announcementRepo: Repository<Announcement>,
        @InjectRepository(AnnouncementRead)
        private readRepo: Repository<AnnouncementRead>,
    ) { }

    async create(createDto: CreateAnnouncementDto, user: User) {
        const announcement = this.announcementRepo.create({
            title: createDto.title,
            content: createDto.content,
            authorId: user['userId'] || user.id, // Support JWT payload structure
        });
        return this.announcementRepo.save(announcement);
    }

    async findAll() {
        return this.announcementRepo.find({
            relations: ['author'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string) {
        const announcement = await this.announcementRepo.findOne({
            where: { id },
            relations: ['author'],
        });
        if (!announcement) throw new NotFoundException('Announcement not found');
        return announcement;
    }

    async update(id: string, updateDto: CreateAnnouncementDto) {
        const announcement = await this.findOne(id);
        Object.assign(announcement, updateDto);
        return this.announcementRepo.save(announcement);
    }

    async remove(id: string) {
        const result = await this.announcementRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Announcement not found');
    }

    async getUnreadCount(userId: string): Promise<{ count: number }> {
        const readIds = await this.readRepo.find({
            where: { userId },
            select: ['announcementId'],
        });
        const readAnnouncementIds = readIds.map(r => r.announcementId);

        let count: number;
        if (readAnnouncementIds.length > 0) {
            count = await this.announcementRepo.count({
                where: { id: Not(In(readAnnouncementIds)) },
            });
        } else {
            count = await this.announcementRepo.count();
        }
        return { count };
    }

    async getForUser(userId: string) {
        const announcements = await this.announcementRepo.find({
            relations: ['author'],
            order: { createdAt: 'DESC' },
        });

        const readRecords = await this.readRepo.find({
            where: { userId },
            select: ['announcementId'],
        });
        const readSet = new Set(readRecords.map(r => r.announcementId));

        return announcements.map(a => ({
            ...a,
            isRead: readSet.has(a.id),
        }));
    }

    async markAllAsRead(userId: string): Promise<{ marked: number }> {
        const readIds = await this.readRepo.find({
            where: { userId },
            select: ['announcementId'],
        });
        const readSet = new Set(readIds.map(r => r.announcementId));

        const allAnnouncements = await this.announcementRepo.find({ select: ['id'] });
        const unread = allAnnouncements.filter(a => !readSet.has(a.id));

        if (unread.length > 0) {
            const records = unread.map(a => this.readRepo.create({
                announcementId: a.id,
                userId,
            }));
            await this.readRepo.save(records);
        }

        return { marked: unread.length };
    }
}
