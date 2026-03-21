import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { Plan } from '../plans/plan.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
    constructor(
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        @InjectRepository(Plan)
        private plansRepository: Repository<Plan>,
    ) { }

    create(createCompanyDto: CreateCompanyDto) {
        const company = this.companiesRepository.create(createCompanyDto);
        return this.companiesRepository.save(company);
    }

    findAll() {
        return this.companiesRepository.find({ relations: ['users', 'plan'] });
    }

    async findByName(companyName: string) {
        return this.companiesRepository.findOneBy({ companyName });
    }

    async findOne(id: string) {
        const company = await this.companiesRepository.findOne({
            where: { id },
            relations: ['users', 'plan'],
        });
        if (!company) {
            throw new NotFoundException(`Company with ID ${id} not found`);
        }
        return company;
    }

    async update(id: string, updateCompanyDto: UpdateCompanyDto) {
        const company = await this.findOne(id);
        const { planId, ...rest } = updateCompanyDto;

        if (planId) {
            const plan = await this.plansRepository.findOneBy({ id: planId });
            if (!plan) throw new NotFoundException('Plan not found');
            company.plan = plan;
            company.planId = planId;
            // Also update limits? No, just the reference. Limits are pulled from plan entity.
        }

        Object.assign(company, rest);
        return this.companiesRepository.save(company);
    }

    async remove(id: string) {
        // Verify company exists before deletion
        await this.findOne(id);
        // Use delete instead of remove to trigger CASCADE DELETE in database
        await this.companiesRepository.delete(id);
        return { message: 'Company deleted successfully', id };
    }

    async getAllPlans() {
        return this.plansRepository.find();
    }
}
