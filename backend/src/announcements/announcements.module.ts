import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementRead } from './entities/announcement-read.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Announcement, AnnouncementRead]),
        UsersModule,
    ],
    controllers: [AnnouncementsController],
    providers: [AnnouncementsService],
    exports: [AnnouncementsService]
})
export class AnnouncementsModule { }
