import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySetting } from './company-setting.entity';

@Injectable()
export class CompanySettingsService {
    constructor(
        @InjectRepository(CompanySetting)
        private repo: Repository<CompanySetting>,
    ) { }

    async get(companyId: string, key: string): Promise<CompanySetting | null> {
        return this.repo.findOne({ where: { companyId, key } });
    }

    async upsert(companyId: string, key: string, value: string): Promise<CompanySetting> {
        let setting = await this.repo.findOne({ where: { companyId, key } });
        if (setting) {
            setting.value = value;
        } else {
            setting = this.repo.create({ companyId, key, value });
        }
        return this.repo.save(setting);
    }

    // Returns parsed payment settings with secrets stripped (for public booking pages)
    async getPublicPaymentSettings(companyId: string): Promise<any> {
        const setting = await this.get(companyId, 'company_payment_settings');
        if (!setting?.value) return {};

        try {
            const ps = JSON.parse(setting.value);
            return {
                razorpay: ps.razorpay?.enabled
                    ? { enabled: true, keyId: ps.razorpay.keyId }
                    : { enabled: false },
                paypal: ps.paypal?.enabled
                    ? { enabled: true, clientId: ps.paypal.clientId, mode: ps.paypal.mode }
                    : { enabled: false },
                bankTransfer: ps.bankTransfer?.enabled
                    ? {
                        enabled: true,
                        bankName: ps.bankTransfer.bankName,
                        accountHolder: ps.bankTransfer.accountHolder,
                        accountNumber: ps.bankTransfer.accountNumber,
                        ifscCode: ps.bankTransfer.ifscCode,
                        branch: ps.bankTransfer.branch,
                    }
                    : { enabled: false },
            };
        } catch {
            return {};
        }
    }

    // Returns full payment settings including secrets (for server-side payment processing)
    async getPrivatePaymentSettings(companyId: string): Promise<any> {
        const setting = await this.get(companyId, 'company_payment_settings');
        if (!setting?.value) return {};
        try {
            return JSON.parse(setting.value);
        } catch {
            return {};
        }
    }
}
