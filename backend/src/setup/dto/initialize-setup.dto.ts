import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class InitializeSetupDto {
    @IsString()
    @IsNotEmpty({ message: 'Company or organization name is required' })
    companyName: string;

    @IsString()
    @IsNotEmpty({ message: 'Administrator full name is required' })
    adminName: string;

    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Administrator email is required' })
    adminEmail: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    adminPassword: string;

    @IsOptional()
    @IsString()
    phone?: string;
}
