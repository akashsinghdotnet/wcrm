import { IsEmail, IsNotEmpty, IsOptional, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsOptional()
    name?: string;

    @IsOptional()
    phone?: string;

    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsOptional()
    firstName?: string;

    @IsOptional()
    lastName?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    companyId?: string;

    @IsOptional()
    canCreateInvoices?: boolean;
}
