import { Injectable, ConflictException, NotFoundException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

import { UpdateUserDto } from './dto/update-user.dto';
import { Company } from '../companies/company.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        private emailService: EmailService,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const { email, password, role, companyId, name, phone, firstName, lastName, canCreateInvoices } = createUserDto;

        const existingUser = await this.usersRepository.findOneBy({ email });
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Superadmin team members (SUPER_ADMIN, SUPERADMIN_ADMIN, SUPERADMIN_STAFF) should not have companyId
        const isSuperadminTeamMember = role === UserRole.SUPER_ADMIN ||
                                       role === UserRole.SUPERADMIN_ADMIN ||
                                       role === UserRole.SUPERADMIN_STAFF;

        let finalCompanyId = companyId;
        if (isSuperadminTeamMember) {
            finalCompanyId = null as any; // Superadmin team members have no company
        }

        // Enforce plan limits for company users only
        if (finalCompanyId && !isSuperadminTeamMember) {
            const company = await this.companiesRepository.findOne({
                where: { id: finalCompanyId },
                relations: ['plan', 'users'],
            });

            if (company?.plan) {
                const activeUsers = company.users?.filter(u => u.isActive) || [];
                const isAdminRole = role === UserRole.ADMIN;

                if (isAdminRole) {
                    const currentAdmins = activeUsers.filter(u => u.role === UserRole.ADMIN).length;
                    if (currentAdmins >= company.plan.adminLimit) {
                        throw new ForbiddenException(
                            `Admin limit reached (${company.plan.adminLimit}). Upgrade plan to add more admins.`
                        );
                    }
                } else {
                    const currentStaff = activeUsers.filter(u => u.role === UserRole.STAFF || u.role === UserRole.MANAGER).length;
                    if (currentStaff >= company.plan.employeeLimit) {
                        throw new ForbiddenException(
                            `Employee limit reached (${company.plan.employeeLimit}). Upgrade plan to add more employees.`
                        );
                    }
                }
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine name
        let finalName = name;
        if (!finalName && (firstName || lastName)) {
            finalName = `${firstName || ''} ${lastName || ''}`.trim();
        }

        const user = this.usersRepository.create({
            email,
            password: hashedPassword,
            role,
            canCreateInvoices: canCreateInvoices || false,
            companyId: finalCompanyId,
            name: finalName,
            firstName,
            lastName,
            phone,
        });

        const savedUser = await this.usersRepository.save(user);

        // Send welcome email (non-blocking — don't fail user creation if email fails)
        try {
            let companyName: string | undefined;
            if (finalCompanyId) {
                const company = await this.companiesRepository.findOne({ where: { id: finalCompanyId } });
                companyName = company?.companyName;
            }
            await this.emailService.sendWelcomeEmail(
                email,
                finalName || email,
                password,
                role || 'staff',
                companyName,
            );
        } catch (error) {
            this.logger.error('Failed to send welcome email:', error.message);
        }

        return savedUser;
    }

    async findAll(companyId?: string, role?: UserRole): Promise<User[]> {
        if (companyId === 'null') {
            // Return all superadmin team members by role (regardless of companyId value)
            return this.usersRepository.find({
                where: [
                    { role: UserRole.SUPER_ADMIN },
                    { role: UserRole.SUPERADMIN_ADMIN },
                    { role: UserRole.SUPERADMIN_STAFF },
                ],
                select: ['id', 'email', 'name', 'phone', 'role', 'isActive', 'canCreateInvoices', 'companyId', 'createdAt', 'updatedAt'],
            });
        }
        const query: any = {};
        if (companyId) {
            query.companyId = companyId;
        }
        if (role) {
            query.role = role;
        }
        return this.usersRepository.find({
            where: query,
            select: ['id', 'email', 'name', 'phone', 'role', 'isActive', 'canCreateInvoices', 'companyId', 'createdAt', 'updatedAt'],
        });
    }

    async findOne(email: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ email });
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ id });
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // If password is being changed, hash the new password
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        // If Name is updated, check if we need to update firstName/lastName or vice versa
        // Current strategy: UpdateUserDto has keys. Just merge.
        // If frontend sends firstName/lastName, we save them.
        // We might want to update 'name' if firstName/lastName are changed.
        if (updateUserDto.firstName || updateUserDto.lastName) {
            const currentFirst = updateUserDto.firstName || user.firstName || '';
            const currentLast = updateUserDto.lastName || user.lastName || '';
            updateUserDto['name'] = `${currentFirst} ${currentLast}`.trim();
        }

        this.usersRepository.merge(user, updateUserDto);
        return this.usersRepository.save(user);
    }

    async deactivate(id: string): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        user.isActive = false;
        return this.usersRepository.save(user);
    }

    /**
     * Get all active staff members for a company (used for round-robin lead assignment)
     */
    async findActiveStaff(companyId: string): Promise<User[]> {
        return this.usersRepository.find({
            where: { companyId, isActive: true },
            select: ['id', 'email', 'role'],
        });
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Current password is incorrect');
        }
        user.password = await bcrypt.hash(newPassword, 10);
        await this.usersRepository.save(user);
        return { message: 'Password changed successfully' };
    }
    async remove(id: string, requestingUser?: any): Promise<void> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        if (user.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Cannot delete a super admin user');
        }

        if (requestingUser) {
            const reqRole = requestingUser.role;

            // Manager can only delete staff in their own company
            if (reqRole === UserRole.MANAGER) {
                if (user.role !== UserRole.STAFF) {
                    throw new ForbiddenException('Managers can only delete staff members');
                }
                if (user.companyId !== requestingUser.companyId) {
                    throw new ForbiddenException('Cannot delete users from another company');
                }
            }

            // Company admin can delete manager + staff in their own company
            if (reqRole === UserRole.ADMIN) {
                if (user.role === UserRole.ADMIN) {
                    throw new ForbiddenException('Admins cannot delete other admins');
                }
                if (user.companyId !== requestingUser.companyId) {
                    throw new ForbiddenException('Cannot delete users from another company');
                }
            }
        }

        await this.usersRepository.remove(user);
    }

    async setTwoFactorSecret(userId: string, secret: string): Promise<void> {
        await this.usersRepository.update(userId, { twoFactorSecret: secret });
    }

    async enableTwoFactor(userId: string): Promise<void> {
        await this.usersRepository.update(userId, { isTwoFactorEnabled: true });
    }

    async disableTwoFactor(userId: string): Promise<void> {
        await this.usersRepository.update(userId, { isTwoFactorEnabled: false, twoFactorSecret: null as any });
    }

    async setResetToken(userId: string, token: string, expires: Date) {
        await this.usersRepository.update(userId, {
            resetPasswordToken: token,
            resetPasswordExpires: expires,
        });
    }

    async findByResetToken(token: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: MoreThan(new Date()),
            },
        });
    }

    async updatePasswordAndClearToken(userId: string, hashedPassword: string) {
        await this.usersRepository.update(userId, {
            password: hashedPassword,
            resetPasswordToken: null as any,
            resetPasswordExpires: null as any,
        });
    }
}


