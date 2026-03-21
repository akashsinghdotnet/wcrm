import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Company } from './company.entity';
import { Plan } from '../plans/plan.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
    private readonly logger = new Logger(CompaniesService.name);

    constructor(
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        @InjectRepository(Plan)
        private plansRepository: Repository<Plan>,
        private dataSource: DataSource,
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

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            this.logger.log(`Starting deletion of company ${id} and all related data`);

            // Wrap each deletion in try-catch to handle missing tables gracefully
            const safeDelete = async (query: string, params: any[]) => {
                try {
                    await queryRunner.query(query, params);
                } catch (error) {
                    // Log but don't fail if table doesn't exist or column is missing
                    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
                        this.logger.warn(`Skipping: ${error.sqlMessage}`);
                    } else {
                        throw error; // Re-throw other errors
                    }
                }
            };

            // Delete all related records in the correct order (child tables first)
            // 1. WhatsApp related data
            await safeDelete('DELETE FROM whatsapp_list_contacts WHERE listId IN (SELECT id FROM whatsapp_lists WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM whatsapp_tag_contacts WHERE tagId IN (SELECT id FROM whatsapp_tags WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM whatsapp_broadcast_logs WHERE broadcastId IN (SELECT id FROM whatsapp_broadcasts WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM whatsapp_broadcasts WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM whatsapp_contacts WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM whatsapp_lists WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM whatsapp_tags WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM whatsapp_templates WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM whatsapp_messages WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM whatsapp_configs WHERE companyId = ?', [id]);

            // 2. Billing & Invoices
            await safeDelete('DELETE FROM invoices WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM invoice_settings WHERE companyId = ?', [id]);

            // 3. Leads, Activities & Lead Assignment Rules
            await safeDelete('DELETE FROM activities WHERE leadId IN (SELECT id FROM leads WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM leads WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM lead_assignment_rules WHERE companyId = ?', [id]);

            // 4. Tickets & Replies
            await safeDelete('DELETE FROM ticket_replies WHERE ticketId IN (SELECT id FROM tickets WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM tickets WHERE companyId = ?', [id]);

            // 5. Clients
            await safeDelete('DELETE FROM clients WHERE companyId = ?', [id]);

            // 6. Calling & Call Logs
            await safeDelete('DELETE FROM call_logs WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM calling_configs WHERE companyId = ?', [id]);

            // 7. Integration Configs
            await safeDelete('DELETE FROM integration_configs WHERE companyId = ?', [id]);

            // 8. Marketing Settings
            await safeDelete('DELETE FROM marketing_settings WHERE companyId = ?', [id]);

            // 9. Email Logs
            await safeDelete('DELETE FROM email_logs WHERE companyId = ?', [id]);

            // 10. Users (must be deleted before company)
            await queryRunner.query('DELETE FROM users WHERE companyId = ?', [id]);

            // 11. Finally, delete the company
            await queryRunner.query('DELETE FROM companies WHERE id = ?', [id]);

            await queryRunner.commitTransaction();
            this.logger.log(`Successfully deleted company ${id} and all related data`);

            return { message: 'Company deleted successfully', id };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to delete company ${id}: ${error.message}`, error.stack);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getAllPlans() {
        return this.plansRepository.find();
    }
}
