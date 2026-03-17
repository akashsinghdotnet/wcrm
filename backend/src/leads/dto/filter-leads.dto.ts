import { IsOptional, IsEnum, IsString, IsDateString, IsUUID } from 'class-validator';
import { LeadSource, LeadStatus } from '../lead.entity';

export class FilterLeadsDto {
    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @IsOptional()
    @IsEnum(LeadSource)
    source?: LeadSource;

    @IsOptional()
    @IsUUID()
    assignedTo?: string;

    @IsOptional()
    @IsString()
    companyId?: string;

    @IsOptional()
    @IsString()
    assigned?: string;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    page?: number;

    @IsOptional()
    limit?: number;
}
