import { IsString, IsEmail, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateContactDto {
    @IsString()
    name: string;

    @IsString()
    phone: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsBoolean()
    @IsOptional()
    isOptedIn?: boolean;

    @IsString()
    @IsOptional()
    optInSource?: string;

    @IsObject()
    @IsOptional()
    customFields?: Record<string, any>;

    @IsOptional()
    listIds?: string[];

    @IsOptional()
    tagIds?: string[];
}
