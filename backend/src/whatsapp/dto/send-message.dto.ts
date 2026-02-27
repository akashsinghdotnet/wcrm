import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    leadId: string;

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
}
