import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketDepartment, TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
    @IsNotEmpty()
    @IsString()
    subject: string;

    @IsNotEmpty()
    @IsEnum(TicketDepartment)
    department: TicketDepartment;

    @IsNotEmpty()
    @IsEnum(TicketPriority)
    priority: TicketPriority;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    attachmentUrl?: string;

    @IsOptional()
    @IsString()
    companyId?: string;
}
