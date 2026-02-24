import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ActivityType } from '../activity.entity';

export class CreateActivityDto {
    @IsUUID()
    leadId: string;

    @IsOptional()
    @IsUUID()
    userId?: string;

    @IsEnum(ActivityType)
    type: ActivityType;

    @IsString()
    content: string;
}
