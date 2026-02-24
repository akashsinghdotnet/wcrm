import { IsEmail, IsNotEmpty, IsString, IsIn, MinLength, IsOptional } from 'class-validator';

export class RegisterSubscriptionDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    password?: string;

    @IsNotEmpty()
    firstName: string;

    @IsNotEmpty()
    lastName: string;

    @IsNotEmpty()
    companyName: string;

    @IsNotEmpty()
    planId: string;

    @IsNotEmpty()
    @IsIn(['monthly', 'yearly'])
    billingPeriod: 'monthly' | 'yearly';

    @IsOptional()
    @IsIn(['razorpay', 'paypal', 'bank_transfer'])
    paymentMethod?: 'razorpay' | 'paypal' | 'bank_transfer';
}
