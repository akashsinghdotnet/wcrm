import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
    constructor(
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
    ) {}

    async findById(id: string): Promise<Company> {
        const company = await this.companyRepository.findOne({ where: { id } });
        if (!company) {
            throw new NotFoundException(`Company #${id} not found`);
        }
        return company;
    }

    async update(id: string, data: Partial<Company>): Promise<Company> {
        const company = await this.findById(id);

        if (data.companyName !== undefined) company.companyName = data.companyName;
        if (data.phone !== undefined) company.phone = data.phone;
        if (data.email !== undefined) company.email = data.email;
        if (data.address !== undefined) company.address = data.address;
        if (data.gstNo !== undefined) company.gstNo = data.gstNo;
        if (data.logoUrl !== undefined) company.logoUrl = data.logoUrl;

        return this.companyRepository.save(company);
    }
}
