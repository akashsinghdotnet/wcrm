import { Injectable, NotFoundException, Logger, Inject, forwardRef, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Company } from './company.entity';
import { Plan } from '../plans/plan.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';

@Injectable()
export class CompaniesService {
    private readonly logger = new Logger(CompaniesService.name);

    constructor(
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        @InjectRepository(Plan)
        private plansRepository: Repository<Plan>,
        private dataSource: DataSource,
        @Inject(forwardRef(() => UsersService))
        private usersService: UsersService,
    ) { }

    async create(createCompanyDto: CreateCompanyDto) {
        const { password, ...companyData } = createCompanyDto;

        // Prevent duplicate companies with the same email
        if (companyData.email) {
            const existingCompany = await this.companiesRepository.findOneBy({ email: companyData.email });
            if (existingCompany) {
                throw new ConflictException(`A company with email "${companyData.email}" already exists (${existingCompany.companyName}). Please use a different email.`);
            }

            // Also check if a company-level user (admin/staff) already exists with this email
            const existingUsers = await this.usersService.findAllByEmail(companyData.email);
            const hasCompanyAccount = existingUsers.some(
                u => u.role === 'admin' || u.role === 'staff'
            );
            if (hasCompanyAccount) {
                throw new ConflictException(`A user with email "${companyData.email}" already has a company account. Please use a different email.`);
            }
        }

        const company = this.companiesRepository.create(companyData as unknown as import('typeorm').DeepPartial<Company>);
        const savedCompany = await this.companiesRepository.save(company);

        // If email and password are provided, automatically create the admin user
        if (companyData.email && password) {
            try {
                await this.usersService.create({
                    email: companyData.email,
                    password: password,
                    name: companyData.companyName + ' Admin',
                    companyId: savedCompany.id,
                    role: UserRole.ADMIN,
                });
                this.logger.log(`Auto-created admin user for company ${savedCompany.id}`);
            } catch (error) {
                this.logger.error(`Failed to auto-create admin user for company ${savedCompany.id}: ${error.message}`);
                // Don't fail the company creation if user creation fails
            }
        }

        return savedCompany;
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
        const { planId, password, ...rest } = updateCompanyDto;

        if (planId) {
            const plan = await this.plansRepository.findOneBy({ id: planId });
            if (!plan) throw new NotFoundException('Plan not found');
            company.plan = plan;
            company.planId = planId;
            // Also update limits? No, just the reference. Limits are pulled from plan entity.
        }

        // If password is provided, find the primary admin and update their password
        if (password) {
            try {
                const adminUsers = await this.usersService.findAll(id, UserRole.ADMIN);
                if (adminUsers && adminUsers.length > 0) {
                    // Update the first admin user
                    await this.usersService.update(adminUsers[0].id, { password });
                    this.logger.log(`Updated admin password for company ${id}`);
                }
            } catch (error) {
                this.logger.error(`Failed to update admin password for company ${id}: ${error.message}`);
            }
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
            await safeDelete('DELETE FROM invoices WHERE companyId = ? OR targetCompanyId = ?', [id, id]);
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

            // 9.5 Recent Modules (Events, Appointments, Hotels, Modules, Settings)
            await safeDelete('DELETE FROM event_bookings WHERE eventId IN (SELECT id FROM events WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM event_ticket_types WHERE eventId IN (SELECT id FROM events WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM events WHERE companyId = ?', [id]);
            
            await safeDelete('DELETE FROM appointments WHERE meetingTypeId IN (SELECT id FROM meeting_types WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM meeting_types WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM appointment_settings WHERE companyId = ?', [id]);
            
            await safeDelete('DELETE FROM hotel_bookings WHERE hotelId IN (SELECT id FROM hotels WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM hotel_room_types WHERE hotelId IN (SELECT id FROM hotels WHERE companyId = ?)', [id]);
            await safeDelete('DELETE FROM hotels WHERE companyId = ?', [id]);
            
            await safeDelete('DELETE FROM module_configs WHERE companyId = ?', [id]);
            await safeDelete('DELETE FROM company_settings WHERE companyId = ?', [id]);

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
