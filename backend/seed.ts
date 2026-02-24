import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CompaniesService } from './src/companies/companies.service';
import { UsersService } from './src/users/users.service';
import { UserRole } from './src/users/user.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const companiesService = app.get(CompaniesService);
    const usersService = app.get(UsersService);

    console.log('Seeding data...');

    // Create Company
    let company = await companiesService.findByName('Magnet HQ');
    if (!company) {
        company = await companiesService.create({
            companyName: 'Magnet HQ',
            email: 'contact@magnethq.com',
            phone: '9876543210', // India default
            address: 'Mumbai, India',
        });
        console.log('Company created:', company.id);
    } else {
        console.log('Company already exists:', company.id);
    }

    // Create Super Admin
    const adminEmail = 'admin@magnethq.com';
    let admin = await usersService.findOne(adminEmail);
    if (!admin) {
        admin = await usersService.create({
            email: adminEmail,
            password: 'password123',
            role: UserRole.SUPER_ADMIN,
            companyId: company.id,
        });
        console.log('Super Admin created:', admin.id);
    } else {
        console.log('Super Admin already exists:', admin.id);
    }

    await app.close();
}

bootstrap();
