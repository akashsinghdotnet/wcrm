import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { TemplateCategory } from '../entities/whatsapp-template.entity';

export class CreateTemplateDto {
    @IsString()
    name: string;

    @IsString()
    content: string;

    @IsEnum(TemplateCategory)
    category: TemplateCategory;

    @IsArray()
    @IsOptional()
    variables?: string[];

    @IsString()
    @IsOptional()
    language?: string;
}
