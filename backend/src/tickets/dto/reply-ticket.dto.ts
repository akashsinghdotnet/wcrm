import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ReplyTicketDto {
    @IsNotEmpty()
    @IsString()
    message: string;

    @IsOptional()
    @IsString()
    attachmentUrl?: string;
}
