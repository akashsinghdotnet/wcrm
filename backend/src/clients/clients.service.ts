import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
    constructor(
        @InjectRepository(Client)
        private clientsRepository: Repository<Client>,
    ) { }

    create(createClientDto: CreateClientDto) {
        const client = this.clientsRepository.create(createClientDto);
        return this.clientsRepository.save(client);
    }

    async findAll(companyId?: string, page: number = 1, limit: number = 10) {
        const query: any = {};
        if (companyId) {
            query.companyId = companyId;
        }

        const [data, total] = await this.clientsRepository.findAndCount({
            where: query,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data, total, page, limit };
    }

    async findOne(id: string) {
        const client = await this.clientsRepository.findOne({
            where: { id },
            relations: ['company'],
        });
        if (!client) {
            throw new NotFoundException(`Client with ID ${id} not found`);
        }
        return client;
    }

    async update(id: string, updateClientDto: UpdateClientDto) {
        const client = await this.findOne(id);
        this.clientsRepository.merge(client, updateClientDto);
        return this.clientsRepository.save(client);
    }

    async bulkUpdate(ids: string[], updateDto: UpdateClientDto) {
        await this.clientsRepository.update({ id: In(ids) }, updateDto);
    }

    async remove(id: string) {
        const client = await this.findOne(id);
        return this.clientsRepository.remove(client);
    }

    async bulkDelete(ids: string[]) {
        await this.clientsRepository.delete({ id: In(ids) });
    }

    /**
     * Count active clients for a company (used by Dashboard)
     */
    async countByCompany(companyId: string): Promise<number> {
        return this.clientsRepository.count({ where: { companyId } });
    }

    /**
     * Sum of monthly fees for active clients in a company (revenue overview)
     */
    async totalRevenue(companyId: string): Promise<number> {
        const result = await this.clientsRepository
            .createQueryBuilder('client')
            .select('SUM(client.monthlyFee)', 'total')
            .where('client.companyId = :companyId', { companyId })
            .andWhere("client.status = 'active'")
            .getRawOne();
        return parseFloat(result?.total) || 0;
    }

    async search(companyId: string, query: string): Promise<Client[]> {
        return this.clientsRepository.createQueryBuilder('client')
            .where('client.companyId = :companyId', { companyId })
            .andWhere('(client.clientName ILIKE :q OR client.email ILIKE :q OR client.phone ILIKE :q)', { q: `%${query}%` })
            .limit(10)
            .getMany();
    }
}
