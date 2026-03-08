import { IsOptional, IsString, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Google Ads Lead Form Webhook payload.
 * Google sends lead data in user_column_data array format.
 * See: https://developers.google.com/google-ads/webhook/docs/implementation
 */

export class GoogleUserColumnData {
    @IsOptional()
    @IsString()
    column_id?: string;

    @IsOptional()
    @IsString()
    column_name?: string;

    @IsOptional()
    @IsString()
    string_value?: string;
}

export class WebhookGoogleDto {
    @IsOptional()
    @IsString()
    lead_id?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GoogleUserColumnData)
    user_column_data?: GoogleUserColumnData[];

    @IsOptional()
    @IsString()
    api_version?: string;

    @IsOptional()
    form_id?: any;

    @IsOptional()
    campaign_id?: any;

    @IsOptional()
    adgroup_id?: any;

    @IsOptional()
    creative_id?: any;

    @IsOptional()
    asset_group_id?: any;

    @IsOptional()
    @IsString()
    gcl_id?: string;

    @IsOptional()
    @IsString()
    google_key?: string;

    @IsOptional()
    @IsBoolean()
    is_test?: boolean;

    @IsOptional()
    @IsString()
    lead_stage?: string;

    @IsOptional()
    @IsString()
    lead_submit_time?: string;

    // Legacy fallback fields (for middleware-based integrations)
    @IsOptional()
    @IsString()
    companyId?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    first_name?: string;

    @IsOptional()
    @IsString()
    last_name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;
}
