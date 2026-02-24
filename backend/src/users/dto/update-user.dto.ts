import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    firstName?: string;

    @IsOptional()
    lastName?: string;

    @IsOptional()
    isTwoFactorEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    canCreateInvoices?: boolean;
}
