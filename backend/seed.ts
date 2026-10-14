import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './src/companies/company.entity';
import { UsersService } from './src/users/users.service';
import { UserRole } from './src/users/user.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const companyRepo = app.get<Repository<Company>>(getRepositoryToken(Company));
    const usersService = app.get(UsersService);

    console.log('Seeding initial self-hosted CRM data...');

    // Create Default Company
    let company = await companyRepo.findOne({ where: { companyName: 'Wcrm' } });
    if (!company) {
        company = companyRepo.create({
            companyName: 'Wcrm',
            email: 'contact@wcrm.si',
            phone: '1234567890',
            address: 'Ljubljana, Slovenia',
        });
        await companyRepo.save(company);
        console.log('Company created:', company.id);
    } else {
        console.log('Company already exists:', company.id);
    }

    // Create Initial Admin User
    const adminEmail = 'admin@wcrm.si';
    let admin = await usersService.findOne(adminEmail);
    if (!admin) {
        admin = await usersService.create({
            email: adminEmail,
            password: 'password123',
            role: UserRole.ADMIN,
            companyId: company.id,
            name: 'Wcrm Admin',
        });
        console.log('Admin user created:', admin.id);
    } else {
        console.log('Admin user already exists:', admin.id);
    }

    await app.close();
}

bootstrap();
