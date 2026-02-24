import { IsOptional, IsString, IsNumber } from 'class-validator';

/**
 * IndiaMART sends data in this format:
 * {
 *   CODE: 200,
 *   STATUS: "SUCCESS",
 *   RESPONSE: {
 *     SUBJECT, QUERY_TIME, SENDER_NAME, SENDER_EMAIL, SENDER_PHONE,
 *     SENDER_MOBILE, SENDER_CITY, SENDER_STATE, QUERY_MESSAGE, etc.
 *   }
 * }
 */
export class WebhookIndiamartResponseDto {
    @IsOptional()
    @IsString()
    SUBJECT?: string;

    @IsOptional()
    @IsString()
    QUERY_TIME?: string;

    @IsOptional()
    @IsString()
    QUERY_TYPE?: string;

    @IsOptional()
    @IsString()
    SENDER_NAME?: string;

    @IsOptional()
    @IsString()
    SENDER_EMAIL?: string;

    @IsOptional()
    @IsString()
    SENDER_PHONE?: string;

    @IsOptional()
    @IsString()
    SENDER_MOBILE?: string;

    @IsOptional()
    @IsString()
    SENDER_CITY?: string;

    @IsOptional()
    @IsString()
    SENDER_STATE?: string;

    @IsOptional()
    @IsString()
    QUERY_MESSAGE?: string;

    @IsOptional()
    @IsString()
    CALL_DURATION?: string;
}

export class WebhookIndiamartDto {
    @IsOptional()
    @IsNumber()
    CODE?: number;

    @IsOptional()
    @IsString()
    STATUS?: string;

    @IsOptional()
    RESPONSE?: WebhookIndiamartResponseDto;

    // Legacy flat fields (in case someone sends directly)
    @IsOptional()
    @IsString()
    companyId?: string;

    @IsOptional()
    @IsString()
    leadname?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    mobile?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    area?: string;
}
