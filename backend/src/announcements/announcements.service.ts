import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AnnouncementsService {
    constructor(
        @InjectRepository(Announcement)
        private announcementRepo: Repository<Announcement>,
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
}
