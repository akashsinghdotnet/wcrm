import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';

export class RenewSubscriptionDto {
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
    couponCode?: string;
}
