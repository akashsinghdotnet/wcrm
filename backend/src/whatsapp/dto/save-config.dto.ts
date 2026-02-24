import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveWhatsAppConfigDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsNotEmpty()
    @IsString()
    phoneNumberId: string;

    @IsNotEmpty()
    @IsString()
    accessToken: string;

    @IsOptional()
    @IsString()
    businessAccountId?: string;
}
