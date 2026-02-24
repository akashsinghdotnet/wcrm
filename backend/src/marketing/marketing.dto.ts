import { IsString, IsNumber, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class SaveSettingsDto {
    @IsString()
    @IsNotEmpty()
    smtpHost: string;

    @IsNumber()
    @IsNotEmpty()
    smtpPort: number;

    @IsString()
    @IsNotEmpty()
    smtpUser: string;

    @IsString()
    @IsString()
    @IsNotEmpty()
    smtpPassword: string;

    @IsOptional()
    smtpSecure: boolean;

    @IsEmail()
    @IsNotEmpty()
    fromEmail: string;

    @IsString()
    @IsOptional()
    fromName: string;
}

export enum MarketingAudience {
    ALL_CLIENTS = 'ALL_CLIENTS',
    ACTIVE_CLIENTS = 'ACTIVE_CLIENTS',
    INACTIVE_CLIENTS = 'INACTIVE_CLIENTS',
    MANUAL = 'MANUAL',
    LEADS = 'LEADS',
}

export class SendEmailDto {
    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    body: string; // HTML content

    @IsOptional()
    audience: MarketingAudience;

    @IsString()
    @IsOptional()
    manualRecipients?: string; // Comma separated emails
}
