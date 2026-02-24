import { IsNotEmpty, IsOptional, IsEmail, IsString } from 'class-validator';

export class WebhookTradeindiaDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    sender_name?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    sender_phone?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    sender_email?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    city?: string;
}
