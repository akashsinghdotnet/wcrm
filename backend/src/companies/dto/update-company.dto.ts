import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
    @IsOptional()
    @IsIn(['monthly', 'yearly'])
    subscriptionPeriod?: 'monthly' | 'yearly';
}
