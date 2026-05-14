import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySetting } from './company-setting.entity';
import { CompanySettingsService } from './company-settings.service';
import { CompanySettingsController } from './company-settings.controller';

@Module({
    imports: [TypeOrmModule.forFeature([CompanySetting])],
    providers: [CompanySettingsService],
    controllers: [CompanySettingsController],
    exports: [CompanySettingsService],
})
export class CompanySettingsModule { }
