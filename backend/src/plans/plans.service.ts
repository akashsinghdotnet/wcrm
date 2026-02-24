
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
    constructor(
        @InjectRepository(Plan)
        private plansRepository: Repository<Plan>,
    ) { }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    create(createPlanDto: CreatePlanDto) {
        const plan = this.plansRepository.create({
            ...createPlanDto,
            slug: this.generateSlug(createPlanDto.name),
        });
        return this.plansRepository.save(plan);
    }

    async findAll() {
        const plans = await this.plansRepository.find({ order: { priceMonthly: 'ASC' } });
        // Auto-generate slugs for existing plans without one
        for (const plan of plans) {
            if (!plan.slug) {
                plan.slug = this.generateSlug(plan.name);
                await this.plansRepository.save(plan);
            }
        }
        return plans;
    }

    async findOne(id: string) {
        const plan = await this.plansRepository.findOne({ where: { id } });
        if (!plan) throw new NotFoundException('Plan not found');
        return plan;
    }

    async findBySlug(slug: string) {
        const plan = await this.plansRepository.findOne({ where: { slug } });
        if (!plan) throw new NotFoundException('Plan not found');
        return plan;
    }

    async update(id: string, updatePlanDto: CreatePlanDto) {
        const plan = await this.findOne(id);
        Object.assign(plan, updatePlanDto);
        if (updatePlanDto.name) {
            plan.slug = this.generateSlug(updatePlanDto.name);
        }
        return this.plansRepository.save(plan);
    }

    async remove(id: string) {
        const result = await this.plansRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Plan not found');
        return result;
    }
}

