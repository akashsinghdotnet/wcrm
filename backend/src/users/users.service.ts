import { Injectable, NotFoundException, ConflictException, ForbiddenException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Company } from '../companies/company.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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

        const hashedPassword = await bcrypt.hash(password, 10);

        let finalName = name;
        if (!finalName && (firstName || lastName)) {
            finalName = `${firstName || ''} ${lastName || ''}`.trim();
        }

        const user = this.usersRepository.create({
            email,
            password: hashedPassword,
            role: role || UserRole.STAFF,
            canCreateInvoices: canCreateInvoices || false,
            companyId,
            name: finalName,
            firstName,
            lastName,
            phone,
        });

        const savedUser = await this.usersRepository.save(user);

        try {
            let companyName: string | undefined;
            if (companyId) {
                const company = await this.companiesRepository.findOne({ where: { id: companyId } });
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
        return this.usersRepository.findOne({
            where: { email },
            relations: ['company'],
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { id },
            relations: ['company'],
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        Object.assign(user, updateUserDto);
        return this.usersRepository.save(user);
    }

    async requestEmailChange(userId: string, newEmail: string): Promise<void> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('User not found');

        if (user.email === newEmail) {
            throw new BadRequestException('New email cannot be the same as current email');
        }

        if (user.emailOtpLockoutUntil && new Date() < user.emailOtpLockoutUntil) {
            const minutesLeft = Math.ceil((user.emailOtpLockoutUntil.getTime() - Date.now()) / (60 * 1000));
            throw new BadRequestException(`Too many attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`);
        }

        if (user.pendingEmail !== newEmail || (user.emailOtpLockoutUntil && new Date() >= user.emailOtpLockoutUntil)) {
            user.emailOtpResendCount = 0;
            user.emailOtpLockoutUntil = null as any;
        }

        if (user.emailOtpResendCount >= 5) {
            user.emailOtpLockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
            await this.usersRepository.save(user);
            throw new BadRequestException(`Too many attempts. Please wait 15 minutes before trying again.`);
        }

        const existing = await this.usersRepository.findOne({ where: { email: newEmail } });
        if (existing && existing.id !== userId) {
            throw new ConflictException('Email address is already in use by another account');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.pendingEmail = newEmail;
        user.emailChangeToken = otp;
        user.emailChangeExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.emailOtpResendCount += 1;

        await this.usersRepository.save(user);

        await this.emailService.sendEmailChangeVerification(newEmail, user.name || user.firstName || 'User', otp);
    }

    async verifyEmailChange(userId: string, otp: string): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('User not found');

        if (!user.emailChangeToken || !user.emailChangeExpires || !user.pendingEmail) {
            throw new BadRequestException('No pending email change request');
        }

        if (new Date() > user.emailChangeExpires) {
            throw new BadRequestException('Verification code has expired. Please request a new one.');
        }

        if (user.emailChangeToken !== otp) {
            throw new BadRequestException('Invalid verification code');
        }

        const oldEmail = user.email;
        user.email = user.pendingEmail;
        
        user.pendingEmail = null as any;
        user.emailChangeToken = null as any;
        user.emailChangeExpires = null as any;
        user.emailOtpResendCount = 0;
        user.emailOtpLockoutUntil = null as any;

        const updatedUser = await this.usersRepository.save(user);

        await this.emailService.sendEmailChangeAlert(oldEmail, user.name || user.firstName || 'User');

        return updatedUser;
    }

    async deactivate(id: string): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        user.isActive = false;
        return this.usersRepository.save(user);
    }

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

        if (requestingUser) {
            const reqRole = requestingUser.role;

            if (reqRole === UserRole.MANAGER) {
                if (user.role !== UserRole.STAFF) {
                    throw new ForbiddenException('Managers can only delete staff members');
                }
            }

            if (reqRole === UserRole.ADMIN) {
                if (user.role === UserRole.ADMIN && requestingUser.userId !== user.id) {
                    throw new ForbiddenException('Admins cannot delete other admins');
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

    async setResetToken(userId: string, token: string, expires: Date): Promise<void> {
        await this.usersRepository.update(userId, {
            resetPasswordToken: token,
            resetPasswordExpires: expires,
        });
    }

    async findByResetToken(token: string): Promise<User | null> {
        const { MoreThan } = await import('typeorm');
        return this.usersRepository.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: MoreThan(new Date()),
            },
        });
    }

    async updatePasswordAndClearToken(userId: string, hashedPassword: string): Promise<void> {
        await this.usersRepository.update(userId, {
            password: hashedPassword,
            resetPasswordToken: null as any,
            resetPasswordExpires: null as any,
        });
    }
}
