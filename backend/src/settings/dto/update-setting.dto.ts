import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingDto {
    @IsString()
    value: string;

    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;
}
