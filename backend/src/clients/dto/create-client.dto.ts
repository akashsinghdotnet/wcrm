import { IsNotEmpty, IsOptional, IsEmail, IsEnum, IsNumber, IsString } from 'class-validator';
import { ClientStatus } from '../client.entity';

export class CreateClientDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsNotEmpty()
    @IsString()
    clientName: string;

    @IsOptional()
    @IsString()
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
    serviceType?: string;

    @IsOptional()
    @IsNumber()
    monthlyFee?: number;

    @IsOptional()
    @IsEnum(ClientStatus)
    status?: ClientStatus;
}
