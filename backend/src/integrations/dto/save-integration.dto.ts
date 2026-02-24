import { IsEnum, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { IntegrationPlatform } from '../integration-config.entity';

export class SaveIntegrationDto {
    @IsString()
    companyId: string;

    @IsEnum(IntegrationPlatform)
    platform: IntegrationPlatform;

    @IsObject()
    @IsOptional()
    credentials?: Record<string, string>;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
