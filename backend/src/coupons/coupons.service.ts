import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './coupon.entity';

@Injectable()
export class CouponsService {
    constructor(
        @InjectRepository(Coupon)
        private couponRepo: Repository<Coupon>,
    ) { }

    async findAll(): Promise<Coupon[]> {
        return this.couponRepo.find({ order: { createdAt: 'DESC' } });
    }

    async create(data: Partial<Coupon>): Promise<Coupon> {
        const existing = await this.couponRepo.findOne({ where: { code: data.code } });
        if (existing) throw new BadRequestException('A coupon with this code already exists');
        const coupon = this.couponRepo.create(data);
        return this.couponRepo.save(coupon);
    }

    async update(id: string, data: Partial<Coupon>): Promise<Coupon> {
        const coupon = await this.couponRepo.findOne({ where: { id } });
        if (!coupon) throw new NotFoundException('Coupon not found');

        // Check duplicate code
        if (data.code && data.code !== coupon.code) {
            const existing = await this.couponRepo.findOne({ where: { code: data.code } });
            if (existing) throw new BadRequestException('A coupon with this code already exists');
        }

        Object.assign(coupon, data);
        return this.couponRepo.save(coupon);
    }

    async remove(id: string): Promise<void> {
        const coupon = await this.couponRepo.findOne({ where: { id } });
        if (!coupon) throw new NotFoundException('Coupon not found');
        await this.couponRepo.remove(coupon);
    }

    async toggleActive(id: string): Promise<Coupon> {
        const coupon = await this.couponRepo.findOne({ where: { id } });
        if (!coupon) throw new NotFoundException('Coupon not found');
        coupon.isActive = !coupon.isActive;
        return this.couponRepo.save(coupon);
    }

    /**
     * Public endpoint: Validate a coupon code
     * Called from the checkout page (no auth required)
     */
    async validate(
        code: string,
        billingCycle?: string,
        planId?: string,
        companyId?: string,
        isRenewal?: boolean,
    ): Promise<Coupon> {
        if (!code) throw new BadRequestException('Coupon code is required');
        const coupon = await this.couponRepo.findOne({
            where: { code: code.trim().toUpperCase(), isActive: true },
        });

        if (!coupon) throw new BadRequestException('Invalid or expired coupon code');

        // Check expiry
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            throw new BadRequestException('This coupon has expired');
        }

        // Check usage limit
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new BadRequestException('This coupon has reached its total usage limit');
        }

        // Check billing cycle
        if (billingCycle && coupon.billingCycle !== 'both' && coupon.billingCycle !== billingCycle) {
            throw new BadRequestException(`This coupon is only valid for ${coupon.billingCycle} billing`);
        }

        // Check plan restriction
        if (planId && coupon.applicablePlanId && coupon.applicablePlanId !== planId) {
            throw new BadRequestException('This coupon is not valid for the selected plan');
        }

        // Check first cycle / renewal restriction
        if (isRenewal && coupon.isFirstCycleOnly) {
            throw new BadRequestException('This coupon code is valid for first-time subscriptions only and cannot be applied to renewals');
        }

        return coupon;
    }

    /**
     * Increment usage count after successful purchase
     */
    async incrementUsage(code: string): Promise<void> {
        const coupon = await this.couponRepo.findOne({ where: { code: code.toUpperCase() } });
        if (coupon) {
            coupon.usedCount = (coupon.usedCount || 0) + 1;
            await this.couponRepo.save(coupon);
        }
    }
}
