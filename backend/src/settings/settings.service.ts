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
        return settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
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
