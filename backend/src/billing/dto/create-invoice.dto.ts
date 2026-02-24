import { IsString, IsNumber, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { InvoiceStatus } from '../invoice.entity';

export class CreateInvoiceDto {
    @IsUUID()
    companyId: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;

    // Guest client details (for invoices without existing client)
    @IsOptional()
    @IsString()
    guestClientName?: string;

    @IsOptional()
    @IsString()
    guestClientEmail?: string;

    @IsOptional()
    @IsString()
    guestClientPhone?: string;

    @IsOptional()
    @IsString()
    guestClientAddress?: string;

    @IsOptional()
    @IsString()
    clientGst?: string;

    @IsNumber()
    amount: number;

    @IsString()
    month: string; // e.g. "Feb 2026"

    @IsOptional()
    @IsString()
    invoiceDate?: string;

    @IsOptional()
    @IsString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    items?: any[];

    @IsOptional()
    @IsNumber()
    subtotal?: number;

    @IsOptional()
    @IsNumber()
    tax?: number;

    @IsOptional()
    @IsNumber()
    total?: number;

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;

    @IsOptional()
    @IsString()
    notes?: string;
}
