import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(Setting)
        private settingsRepo: Repository<Setting>,
    ) { }

    async findAllPublic() {
        const settings = await this.settingsRepo.find({ where: { isPublic: true } });
        // Return as key-value map for easier frontend consumption
        const mapped = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        // Inject system deployment configuration
        mapped['deployment_mode'] = process.env.DEPLOYMENT_MODE || 'cloud'; // 'cloud' | 'self_hosted'
        mapped['app_version'] = process.env.APP_VERSION || '1.0.0';
        mapped['cloud_url'] = process.env.CLOUD_URL || 'https://wcrm.si';
        mapped['community_feed_url'] = process.env.COMMUNITY_FEED_URL || '';

        return mapped;
    }

    async getCommunityFeed() {
        return {
            version: process.env.APP_VERSION || '1.0.0',
            latestVersion: '1.0.0',
            announcements: [
                {
                    id: 'wcrm-cloud-welcome',
                    title: 'Switch to Wcrm Managed Cloud',
                    message: 'Get 99.9% uptime, zero DevOps maintenance, automated daily backups, and official Meta WhatsApp Cloud API Embedded Signup.',
                    badge: 'Managed Cloud',
                    ctaText: 'Explore Cloud',
                    ctaUrl: process.env.CLOUD_URL || 'https://wcrm.si',
                    publishedAt: new Date().toISOString(),
                }
            ]
        };
    }

    async update(key: string, dto: UpdateSettingDto) {
        let setting = await this.settingsRepo.findOne({ where: { key } });
        if (setting) {
            setting.value = dto.value;
            if (dto.isPublic !== undefined) setting.isPublic = dto.isPublic;
        } else {
            setting = this.settingsRepo.create({
                key,
                value: dto.value,
                isPublic: dto.isPublic ?? false, // Default to private if creating new
            });
        }
        return this.settingsRepo.save(setting);
    }

    // Internal helper to get a value
    async getValue(key: string): Promise<string | null> {
        const setting = await this.settingsRepo.findOne({ where: { key } });
        return setting ? setting.value : null;
    }
}
