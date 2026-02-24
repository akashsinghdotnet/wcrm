import { IsNotEmpty, IsOptional, IsEmail, IsEnum, IsString, IsDateString, IsUUID } from 'class-validator';
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
    @IsDateString()
    followUpDate?: string;
}
