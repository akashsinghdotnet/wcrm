import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
    @IsOptional()
    @IsString()
    leadId?: string;

    @IsNotEmpty()
    @IsString()
    to: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    mediaId?: string;

    @IsOptional()
    @IsString()
    replyToMessageId?: string;
}
