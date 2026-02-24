import { IsNotEmpty, IsOptional, IsEmail, IsString } from 'class-validator';

export class WebhookJustdialDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    leadname?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    mobile?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    area?: string;
}
