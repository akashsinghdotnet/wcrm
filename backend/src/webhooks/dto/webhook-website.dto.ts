import { IsNotEmpty, IsOptional, IsEmail, IsString } from 'class-validator';

export class WebhookWebsiteDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    message?: string;
}
