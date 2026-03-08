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

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    streetAddress?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    postcode?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsOptional()
    @IsString()
    couponCode?: string;
}
