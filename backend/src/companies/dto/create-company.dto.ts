import { IsNotEmpty, IsOptional, IsEmail, IsPhoneNumber, IsIn, IsDateString, IsString } from 'class-validator';

export class CreateCompanyDto {
    @IsNotEmpty()
    @IsString()
    companyName: string;

    @IsOptional()
    @IsPhoneNumber('IN')
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    gstNo?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    ownerUserId?: string;

    @IsOptional()
    planId?: string;

    @IsOptional()
    @IsIn(['active', 'past_due', 'cancelled', 'pending_payment'])
    subscriptionStatus?: string;

    @IsOptional()
    @IsIn(['monthly', 'yearly'])
    subscriptionPeriod?: 'monthly' | 'yearly';

    @IsOptional()
    @IsDateString()
    renewalDate?: string | null;
}
