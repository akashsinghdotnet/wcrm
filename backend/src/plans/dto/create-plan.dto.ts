
import { IsNotEmpty, IsNumber, IsOptional, Min, IsArray } from 'class-validator';

export class CreatePlanDto {
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(0)
    priceMonthly: number;

    @IsNumber()
    @Min(0)
    priceYearly: number;

    @IsNumber()
    @Min(1)
    adminLimit: number;

    @IsNumber()
    @Min(1)
    employeeLimit: number;

    @IsOptional()
    @IsArray()
    features?: string[];
}
