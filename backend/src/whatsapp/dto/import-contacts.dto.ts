import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator';

export class ImportContactsDto {
    @IsArray()
    contacts: {
        name: string;
        phone: string;
        email?: string;
        notes?: string;
        isOptedIn?: boolean;
        optInSource?: string;
    }[];

    @IsString()
    @IsOptional()
    defaultOptInSource?: string;

    @IsBoolean()
    @IsOptional()
    skipDuplicates?: boolean;
}
