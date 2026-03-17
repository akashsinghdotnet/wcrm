import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateListDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    color?: string;

    @IsArray()
    @IsOptional()
    contactIds?: string[];
}
