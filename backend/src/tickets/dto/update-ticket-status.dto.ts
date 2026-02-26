import { IsEnum } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

export class UpdateTicketStatusDto {
    @IsEnum(TicketStatus)
    status: TicketStatus;
}
