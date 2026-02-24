import { IsNotEmpty, IsOptional, IsEmail, IsString } from 'class-validator';

export class WebhookGoogleDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    first_name?: string;

    @IsOptional()
    @IsString()
    last_name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;
}
