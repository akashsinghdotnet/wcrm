import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    leadId: string;

    @IsNotEmpty()
    @IsString()
    to: string;

    @IsNotEmpty()
    @IsString()
    message: string;
}
