import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';

export class CreateBroadcastDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    templateId?: string;

    @IsString()
    @IsOptional()
    message?: string;

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
