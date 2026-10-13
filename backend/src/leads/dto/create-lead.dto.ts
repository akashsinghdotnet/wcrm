import { IsNotEmpty, IsOptional, IsEmail, IsEnum, IsString, IsDateString, IsUUID, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { LeadSource, LeadStatus } from '../lead.entity';

export class CreateLeadDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @Transform(({ value }) => (value === '' ? undefined : value))
    @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsEnum(LeadSource)
    source?: LeadSource;

    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @IsOptional()
    @IsUUID()
    assignedTo?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    designation?: string;

    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsString()
    website?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsDateString()
    followUpDate?: string;
}
