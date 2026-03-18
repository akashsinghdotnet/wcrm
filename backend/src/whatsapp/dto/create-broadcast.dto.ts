import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsIn } from 'class-validator';

export class CreateBroadcastDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    templateId?: string;

    @IsString()
    @IsOptional()
    message?: string;

    @IsString()
    @IsOptional()
    @IsIn(['all', 'unorganized', 'lists_tags'])
    targetType?: string; // 'all', 'unorganized', 'lists_tags'

    @IsArray()
    @IsOptional()
    targetListIds?: string[];

    @IsArray()
    @IsOptional()
    targetTagIds?: string[];

    @IsArray()
    @IsOptional()
    targetContactIds?: string[];

    @IsBoolean()
    @IsOptional()
    onlyOptedIn?: boolean;

    @IsDateString()
    @IsOptional()
    scheduledAt?: string;
}
