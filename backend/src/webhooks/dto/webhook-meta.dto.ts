import { IsNotEmpty, IsOptional, IsEmail, IsString } from 'class-validator';

export class WebhookMetaDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    full_name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    phone_number?: string;

    @IsOptional()
    @IsEmail()
    email?: string;
}
